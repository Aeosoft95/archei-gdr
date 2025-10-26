// FILE: server/ws-server.ts
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "./auth";

// Porta corretta per Railway (usa PORT; fallback a WS_PORT e 8787 in locale)
const PORT = Number(process.env.PORT || process.env.WS_PORT || 8787);

// HTTP server per rispondere a / e /health (utile per i check dell'edge)
const server = http.createServer((req, res) => {
  // CORS basico (opzionale)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }

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

// Attacca il WebSocketServer all'HTTP server
const wss = new WebSocketServer({ server });

type ClientInfo = {
  ws: WebSocket;
  user: { id: string; name?: string };
  code: string;     // codice stanza (es. ABC123)
  isAlive: boolean;
};
const clients = new Set<ClientInfo>();

function heartbeat(this: ClientInfo) { this.isAlive = true; }

// Broadcast confinato alla stanza
function broadcast(code: string, msg: any) {
  for (const c of clients) {
    if (c.code !== code) continue;
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(JSON.stringify(msg));
    }
  }
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", "http://localhost");
  const token = url.searchParams.get("token") || "";
  const code  = (url.searchParams.get("code") || "").toUpperCase();

  const user = token ? verifyToken(token) : null;
  if (!user || !code) {
    ws.send(JSON.stringify({ type: "error", msg: "Invalid token or code" }));
    ws.close();
    return;
  }

  const info: ClientInfo = {
    ws,
    user: { id: (user as any).id, name: (user as any).name },
    code,
    isAlive: true,
  };
  clients.add(info);

  ws.on("pong", heartbeat.bind(info));

  // Benvenuto solo al client entrante
  ws.send(JSON.stringify({
    type: "welcome",
    code,
    user: info.user,
    ts: Date.now(),
  }));

  // Notifica join agli altri della stanza (opzionale)
  broadcast(code, {
    type: "system",
    code,
    text: `${info.user.name || "Utente"} è entrato nella stanza.`,
    ts: Date.now(),
  });

  ws.on("message", (raw) => {
    let payload: any = null;
    try { payload = JSON.parse(raw.toString()); }
    catch { return; }

    const base = {
      code,
      from: { id: info.user.id, name: info.user.name || "User" },
      ts: Date.now(),
    };

    // Accettiamo: {type:"chat", text}, {type:"dice", expr,total,detail}
    if (payload.type === "chat" && typeof payload.text === "string") {
      broadcast(code, { type: "chat", text: String(payload.text), ...base });
      return;
    }

    if (payload.type === "dice" && payload.expr) {
      broadcast(code, {
        type: "dice",
        expr: String(payload.expr),
        total: Number(payload.total),
        detail: typeof payload.detail === "string" ? payload.detail : undefined,
        ...base,
      });
      return;
    }

    // Fallback: inoltra come generico "broadcast" (debug)
    broadcast(code, { type: "broadcast", payload, ...base });
  });

  ws.on("close", () => {
    clients.delete(info);
    // Notifica leave (opzionale)
    broadcast(code, {
      type: "system",
      code,
      text: `${info.user.name || "Utente"} ha lasciato la stanza.`,
      ts: Date.now(),
    });
  });
});

// Heartbeat anti-timeout (CDN-friendly)
const interval = setInterval(() => {
  for (const c of clients) {
    if (!c.isAlive) { try { c.ws.terminate(); } catch {} clients.delete(c); continue; }
    c.isAlive = false;
    try { c.ws.ping(); } catch {}
  }
}, 30000);

wss.on("close", () => clearInterval(interval));

// Avvio su 0.0.0.0 (obbligatorio in PaaS)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ WS server listening on 0.0.0.0:${PORT}`);
});