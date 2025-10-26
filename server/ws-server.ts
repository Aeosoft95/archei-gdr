// server/ws-server.ts
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "./auth";
import crypto from "crypto";

const PORT = Number(process.env.PORT || process.env.WS_PORT || 8787);

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

type UserLite = { id?: string; name?: string };
type ClientInfo = {
  ws: WebSocket;
  user: UserLite;
  roomCode: string;
  isAlive: boolean;
};
const clients = new Set<ClientInfo>();

function heartbeat(this: ClientInfo) { this.isAlive = true; }

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", "http://localhost");
  const token = url.searchParams.get("token") || undefined;
  const roomCode = (url.searchParams.get("code") || "").toUpperCase();

  // Richiedi SEMPRE token e code (solo utenti registrati)
  if (!token || !roomCode || !/^[A-Z0-9]{4,}$/.test(roomCode)) {
    ws.send(JSON.stringify({ type: "error", msg: "auth_required", detail: "Missing/invalid token or room code" }));
    ws.close();
    return;
  }

  // Verifica token: qualunque utente autenticato è ok (no controllo GM)
  let user: UserLite | null = null;
  try {
    const u = verifyToken(token) as any;
    if (u && typeof u === "object") {
      user = { id: String(u.id || u.sub || ""), name: String(u.name || "Player") };
    }
  } catch {}

  if (!user || !user.id) {
    ws.send(JSON.stringify({ type: "error", msg: "invalid_token" }));
    ws.close();
    return;
  }

  const info: ClientInfo = { ws, user, roomCode, isAlive: true };
  clients.add(info);

  ws.on("pong", heartbeat.bind(info));
  ws.send(JSON.stringify({ type: "welcome", user, room: roomCode }));

  broadcast(roomCode, { type: "system", text: `${user.name || "Player"} si è unito alla stanza.`, ts: Date.now() });

  ws.on("message", (raw) => {
    let payload: any;
    try { payload = JSON.parse(raw.toString()); }
    catch { payload = { type: "chat", text: raw.toString() }; }

    const base = { from: user!, room: roomCode, ts: Date.now() };

    if (payload?.type === "chat" && payload.text) {
      broadcast(roomCode, { type: "chat", text: String(payload.text), ...base });
      return;
    }
    if (payload?.type === "dice" && payload.expr) {
      broadcast(roomCode, { type: "dice", expr: payload.expr, total: Number(payload.total), detail: payload.detail, ...base });
      return;
    }

    broadcast(roomCode, { type: "event", payload, ...base });
  });

  ws.on("close", () => {
    clients.delete(info);
    broadcast(roomCode, { type: "system", text: `${user!.name || "Player"} ha lasciato la stanza.`, ts: Date.now() });
  });
});

function broadcast(roomCode: string, msg: any) {
  for (const c of clients) {
    if (c.roomCode !== roomCode) continue;
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(JSON.stringify(msg));
    }
  }
}

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