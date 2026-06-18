# Online Mandawee Realtime (Socket.IO)

Standalone Socket.IO service for dispute messaging broadcasts. Runs on your VPS; the Next.js app on Vercel publishes events over HTTP after REST mutations succeed.

## Requirements

- Node.js 20+
- Same `DATABASE_URL` and `JWT_ACCESS_SECRET` as the main app
- A shared `REALTIME_INTERNAL_SECRET` (min 16 chars) on both VPS and Vercel

## Environment

```env
PORT=3100
DATABASE_URL=
JWT_ACCESS_SECRET=
REALTIME_INTERNAL_SECRET=
REALTIME_CORS_ORIGIN=https://onlinemandawee.vercel.app,https://onlinemandawee.com,http://localhost:3000
```

## Vercel (main app)

```env
REALTIME_PUBLISH_URL=https://realtime.yourdomain.com/internal/broadcast
REALTIME_INTERNAL_SECRET=<same secret as VPS>
NEXT_PUBLIC_REALTIME_URL=https://realtime.yourdomain.com
```

## Local development

```bash
cd realtime
npm install
npm run dev
```

Main app `.env.local`:

```env
REALTIME_PUBLISH_URL=http://127.0.0.1:3100/internal/broadcast
REALTIME_INTERNAL_SECRET=dev-realtime-secret-min16
NEXT_PUBLIC_REALTIME_URL=http://127.0.0.1:3100
REALTIME_CORS_ORIGIN=http://localhost:3000
```

## VPS deployment (PM2 + nginx)

```bash
cd /opt/onlinemandawee/realtime
npm ci
npm run build
pm2 start dist/server.js --name onlinemandawee-realtime
pm2 save
```

Nginx WebSocket proxy example:

```nginx
location /socket.io/ {
  proxy_pass http://127.0.0.1:3100/socket.io/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}

location /internal/broadcast {
  allow 127.0.0.1;
  deny all;
  proxy_pass http://127.0.0.1:3100/internal/broadcast;
}
```

Expose `/internal/broadcast` only to Vercel egress IPs or route publish traffic through the VPS itself if the app is co-hosted later. For Vercel → VPS, restrict by secret + IP allowlist or a private tunnel.

## Architecture

1. Client sends messages via existing REST `POST /api/refunds/[id]/messages`.
2. `RefundService` persists to MongoDB, then POSTs to `/internal/broadcast`.
3. Socket.IO emits to room `dispute:{refundCaseId}`.
4. Connected clients receive `dispute:message` or `dispute:updated` events.

REST remains the source of truth. WebSockets are notification only.
