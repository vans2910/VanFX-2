# Van Pips Backend

Dependency-free Node.js REST API with a WebSocket feed for web and mobile clients.

## Run

```powershell
cd "C:\Users\user\OneDrive\Documents\VanFX 2"
npm start
```

The API runs on `http://localhost:4000` by default.

## Environment

Copy `backend/.env.example` to `.env` and change the secrets before deployment.

## REST Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/signals`
- `POST /api/signals` admin only
- `GET /api/free-content`
- `POST /api/free-content` admin only
- `GET /api/videos`
- `POST /api/videos` admin only
- `GET /api/notifications`
- `POST /api/subscriptions/request`
- `GET /api/admin/users` admin only
- `PATCH /api/admin/users/:id/subscription` admin only

Authenticated requests use:

```http
Authorization: Bearer <token>
```

## WebSocket

Connect to:

```text
ws://localhost:4000/ws
```

Clients receive events like:

```json
{ "type": "signal.created", "payload": { "...": "..." } }
```

Admin-created signals, videos, free content, and subscription updates are broadcast to connected web/mobile clients.
