// FILE: server/ws-server.ts
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "./auth";

// Porta corretta per Railway (usa PORT; fallback a WS_PORT e 8787 in locale)
const PORT = Number(process.env.PORT || process.env.WS_PORT || 8787);

// HTTP server per rispondere a / e /health (utile per i check dell'edge)
const server = http.createServer((req, res) => {
  // CORS basico per debug (opzionale)
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
  user: any;
  isAlive: boolean;
};
const clients = new Set<ClientInfo>();

function heartbeat(this: ClientInfo) { this.isAlive = true; }

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", "http://localhost");
  const token = url.searchParams.get("token");
  const user = token ? verifyToken(token) : null;

  if (!user) {
    ws.send(JSON.stringify({ type: "error", msg: "Invalid token" }));
    ws.close();
    return;
  }

  const info: ClientInfo = { ws, user, isAlive: true };
  clients.add(info);

  ws.on("pong", heartbeat.bind(info));
  ws.send(JSON.stringify({ type: "welcome", user }));

  ws.on("message", (raw) => {
    let payload: any = null;
    try { payload = JSON.parse(raw.toString()); }
    catch { payload = { type: "text", text: raw.toString() }; }

    for (const c of clients) {
      if (c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(JSON.stringify({ type: "broadcast", from: (user as any).name ?? "User", payload }));
      }
    }
  });

  ws.on("close", () => { clients.delete(info); });
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
