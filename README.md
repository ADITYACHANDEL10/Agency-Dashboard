# Agency Project Dashboard

Internal tool for managing client projects, tasks, and team activity in real time.

## Stack

- Frontend: React + TypeScript (Vite)
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma
- Real-time: Socket.io
- Jobs: node-cron (overdue tasks)

## Quick start

### 1. Database

```bash
docker compose up -d
```

### 2. Backend

```bash
cd server
cp .env.example .env   # already has sensible defaults
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

Server runs on http://localhost:4000

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

App runs on http://localhost:5173

## Demo logins

Password for everyone: `password123`

| Role | Email |
|------|-------|
| Admin | admin@agency.com |
| Project Manager | pm1@agency.com  |
| Project Manager | pm2@agency.com  |
| Developer | dev1@agency.com … dev4@agency.com |

## What works

- JWT auth with refresh token in HttpOnly cookie
- Role-based access enforced on every API route + in queries
- PM only sees/manages their own projects
- Developer only sees tasks assigned to them
- Live activity feed via Socket.io (project rooms)
- Offline catch-up: last 20 events from DB filtered by role
- Task status changes write history + activity log + emit live
- Notifications with unread badge + real-time updates
- Overdue tasks marked by hourly cron job
- Dashboard stats per role
- Task filters via query params (shareable URLs)
- Live online user count for Admin

## Architectural notes

**Why Express?** Team already knows the middleware patterns and Socket.io integrates cleanly. Fastify would be fine too but not worth switching for this size.

**Why Socket.io?** Rooms, reconnection, and auth middleware save a lot of boilerplate vs raw WebSocket. We only need project rooms and a simple presence count.

**Why node-cron?** One recurring job (overdue check). Redis + Bull is overkill until we add email digests or heavier work.

**Token storage:** Access token in memory on the client. Refresh token in HttpOnly cookie so XSS can’t steal it.

**Indexes:** Put on the columns we actually filter and sort by — `Task(projectId, status)`, `Task(assigneeId, status)`, `ActivityLog(projectId, createdAt)`, `Notification(userId, isRead)`, etc.

## Known limitations

- No user-management UI (seed only)
- Presence is a count, not a full list of who is online
- No file attachments
- Overdue job runs hourly
- Frontend is clean but intentionally minimal — focused on data flow and permissions

## Deploy notes

- Frontend → Vercel (set `VITE_API_URL` to your backend URL)
- Backend → Railway / Render / Fly (needs a long-running process for WebSockets + cron)
- Point `CLIENT_URL` and CORS at the Vercel domain
- Use a real Postgres instance and strong JWT secrets

---

If something looks wrong, check the role of the logged-in user first. A lot of “bugs” are just the permission boundaries doing their job.
