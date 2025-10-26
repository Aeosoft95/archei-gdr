// FILE: server/ws-server.ts
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "./auth";

// Porta per Railway (usa PORT / WS_PORT, fallback 8787)
const PORT = Number(process.env.PORT || process.env.WS_PORT || 8787);

// HTTP server per healthcheck
const server = http.createServer((req, res) => {
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

const wss = new WebSocketServer({ server });

type ClientInfo = {
  ws: WebSocket;
  user: { id?: string; name?: string } | null;
  roomCode: string | null;
  isAlive: boolean;
};
const clients = new Set<ClientInfo>();

function heartbeat(this: ClientInfo) { this.isAlive = true; }

// helper: normalizza il room code (A-Z0-9, 6 char) oppure null
function normCode(v: string | null): string | null {
  if (!v) return null;
  const up = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (up.length !== 6) return null;
  return up;
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", "http://localhost");
  const token = url.searchParams.get("token");
  // accetta entrambe le chiavi: ?code=ABC123 oppure ?room=ABC123
  const codeParam = url.searchParams.get("code") || url.searchParams.get("room");
  const roomCode = normCode(codeParam);

  const user = token ? verifyToken(token) : null;
  if (!user) {
    ws.send(JSON.stringify({ type: "error", msg: "Invalid token" }));
    ws.close();
    return;
  }
  if (!roomCode) {
    ws.send(JSON.stringify({ type: "error", msg: "Invalid room code" }));
    ws.close();
    return;
  }

  const info: ClientInfo = { ws, user, roomCode, isAlive: true };
  clients.add(info);

  ws.on("pong", heartbeat.bind(info));

  // benvenuto
  ws.send(JSON.stringify({
    type: "welcome",
    user: { id: (user as any).id, name: (user as any).name },
    room: roomCode,
    ts: Date.now()
  }));

  // broadcast join system message alla stanza
  for (const c of clients) {
    if (c.roomCode === roomCode && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(JSON.stringify({
        type: "system",
        text: `${(user as any).name || "User"} si è unito alla stanza.`,
        ts: Date.now()
      }));
    }
  }

  ws.on("message", (raw) => {
    let payload: any = null;
    try { payload = JSON.parse(raw.toString()); }
    catch { payload = { type: "text", text: raw.toString() }; }

    // Arricchisci il messaggio con mittente/room lato server
    const envelope = {
      ...payload,
      room: roomCode,
      from: { id: (user as any).id, name: (user as any).name },
      ts: Date.now(),
    };

    // broadcast solo ai client nella stessa stanza
    for (const c of clients) {
      if (c.roomCode === roomCode && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(JSON.stringify(envelope));
      }
    }
  });

  ws.on("close", () => { clients.delete(info); });
});

// Heartbeat anti-timeout
const interval = setInterval(() => {
  for (const c of clients) {
    if (!c.isAlive) { try { c.ws.terminate(); } catch {} clients.delete(c); continue; }
    c.isAlive = false;
    try { c.ws.ping(); } catch {}
  }
}, 30000);

wss.on("close", () => clearInterval(interval));

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ WS server listening on 0.0.0.0:${PORT}`);
});