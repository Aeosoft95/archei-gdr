// FILE: server/ws-server.ts
import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "./auth";

const port = process.env.WS_PORT ? Number(process.env.WS_PORT) : 8787;
const wss = new WebSocketServer({ port, host: "0.0.0.0" });

type ClientInfo = {
  ws: WebSocket;
  user: any;
  isAlive: boolean;
};
const clients = new Set<ClientInfo>();

function heartbeat(this: ClientInfo) {
  this.isAlive = true;
}

wss.on("connection", (ws, req) => {
  const params = new URL(req.url || "/", "http://localhost").searchParams;
  const token = params.get("token");
  const user = token ? verifyToken(token) : null;

  if (!user) {
    ws.send(JSON.stringify({ type: "error", msg: "Invalid token" }));
    ws.close();
    return;
  }

  const info: ClientInfo = { ws, user, isAlive: true };
  clients.add(info);

  // PONG -> heartbeat
  ws.on("pong", heartbeat.bind(info));

  ws.send(JSON.stringify({ type: "welcome", user }));

  ws.on("message", (raw) => {
    let payload: any = null;
    try { payload = JSON.parse(raw.toString()); } catch { payload = { type: "text", text: raw.toString() }; }

    // Broadcasting minimale (roomless)
    for (const c of clients) {
      if (c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(JSON.stringify({ type: "broadcast", from: (user as any).name ?? "User", payload }));
      }
    }
  });

  ws.on("close", () => { clients.delete(info); });
});

// Heartbeat anti-timeout (Cloudflare/CDN-friendly)
const interval = setInterval(() => {
  for (const c of clients) {
    if (!c.isAlive) {
      c.ws.terminate();
      clients.delete(c);
      continue;
    }
    c.isAlive = false;
    try { c.ws.ping(); } catch {}
  }
}, 30000);

wss.on("close", () => clearInterval(interval));

console.log(`✅ WS server running on ws://0.0.0.0:${port}`);
