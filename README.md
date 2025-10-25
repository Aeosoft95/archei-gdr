# ARCHEI Companion

Companion locale per manuale ARCHEI — con autenticazione, MongoDB e WebSocket.

## 🚀 Avvio (Docker consigliato)

```bash
docker compose up --build
```

Apri da LAN:
```
http://<ip-locale>:3000
ws://<ip-locale>:8787
```

Mongo sarà disponibile su: `mongodb://localhost:27017/archei`

## 💻 Avvio manuale (senza Docker)

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev:web
pnpm dev:ws
```

## 📦 Stack
- Next.js 14 (ESM)
- TailwindCSS (+ PostCSS)
- MongoDB (Mongoose)
- NextAuth v4 + JWT (pages/api)
- WebSocket realtime (ws)


## 🟦 Avvio su Windows senza Docker
1. Installa **Node.js 20+** e **pnpm** (`npm i -g pnpm`).
2. Doppio click su `start-local.bat` (crea env, installa deps, avvia WS e Web).
3. Apri `http://localhost:3000` (o `http://<ip-locale>:3000` da telefono).

