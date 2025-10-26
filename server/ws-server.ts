// FILE: server/ws-server.ts
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "./auth";

// Porta corretta per Railway (usa PORT; fallback a WS_PORT e 8787 in locale)
const PORT = Number(process.env.PORT || process.env.WS_PORT || 8787);

type UserLite = { id?: string; name?: string } | null;

type ClientInfo = {
  ws: WebSocket;
  user: UserLite;
  roomCode: string;
  isAlive: boolean;
};

const clients = new Set<ClientInfo>();

// ---- helpers ----------------------------------------------------------------

function normalizeUser(payload: unknown): UserLite {
  if (!payload) return null;
  if (typeof payload === "string") {
    // se il token fosse una stringa, trattiamola come "name"
    return { name: payload };
  }
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const id = typeof obj.id === "string" ? obj.id : undefined;
    const name = typeof obj.name === "string" ? obj.name : undefined;
    // accettiamo anche "sub" come id se presente
    const sub = typeof obj.sub === "string" ? obj.sub : undefined;
    return { id: id ?? sub, name };
  }
  return null;
}

function heartbeat(this: ClientInfo) {
  this.isAlive = true;
}

// ---- HTTP server: / e /health ----------------------------------------------

const server = http.createServer((req, res) => {
  // CORS basico (facilita i check)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, service: "archei-ws" }));
  }
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// ---- WebSocket server -------------------------------------------------------

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", "http://localhost");

  // accettiamo sia ?token= sia header Authorization (ma qui usiamo la query)
  const token = url.searchParams.get("token") || undefined;

  // accettiamo sia ?code= sia ?room=
  const roomCode =
    (url.searchParams.get("code") || url.searchParams.get("room") || "")
      .toUpperCase()
      .trim();

  const user = normalizeUser(token ? verifyToken(token) : null);

  if (!user || !roomCode) {
    ws.send(
      JSON.stringify({
        type: "error",
        msg: "Invalid token or code",
        ts: Date.now(),
      })
    );
    ws.close();
    return;
  }

  const info: ClientInfo = { ws, user, roomCode, isAlive: true };
  clients.add(info);

  ws.on("pong", heartbeat.bind(info));

  // Benvenuto
  ws.send(JSON.stringify({ type: "welcome", user, room: roomCode, ts: Date.now() }));

  ws.on("message", (raw) => {
    let payload: any = null;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      payload = { type: "text", text: raw.toString() };
    }

    // Se arriva un "join" con un altro code, ignoriamo (stanza bloccata dalla querystring)
    if (payload?.type === "join" && payload?.code) {
      // opzionale: potresti riassegnare la stanza qui, ma meglio ignorare
    }

    // Rimbalza solo ai client nella stessa stanza
    const out = {
      // preserva un eventuale cid per deduplicare lato client
      cid: payload?.cid,
      type: payload?.type || "broadcast",
      from: { id: info.user?.id, name: info.user?.name },
      room: info.roomCode,
      ...payload,
      ts: Date.now(),
    };

    for (const c of clients) {
      if (c.roomCode !== info.roomCode) continue; // stessa stanza
      if (c.ws.readyState === WebSocket.OPEN) {
        try {
          c.ws.send(JSON.stringify(out));
        } catch {
          // ignore
        }
      }
    }
  });

  ws.on("close", () => {
    clients.delete(info);
  });
});

// Heartbeat anti-timeout (CDN-friendly)
const interval = setInterval(() => {
  for (const c of clients) {
    if (!c.isAlive) {
      try {
        c.ws.terminate();
      } catch {}
      clients.delete(c);
      continue;
    }
    c.isAlive = false;
    try {
      c.ws.ping();
    } catch {}
  }
}, 30000);

wss.on("close", () => clearInterval(interval));

// Avvio su 0.0.0.0 (obbligatorio in PaaS)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ WS server listening on 0.0.0.0:${PORT}`);
});