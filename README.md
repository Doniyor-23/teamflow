# TeamFlow

React + Vite + Tailwind + GSAP + dnd-kit frontend, Express + MongoDB backend.

## Requirements
Node 18+ and a running MongoDB (local or Atlas).

## Setup
```
cd backend && cp .env.example .env   # set JWT_SECRET and MONGODB_URI
npm install && npm run dev           # API on :5000

cd frontend && cp .env.example .env
npm install && npm run dev           # app on :5173
```
Register an account at /register, create a project, then add tasks on the Kanban Board.

## Email (SMTP)
Registration, password reset and invitations send real emails. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` in `backend/.env`.
Codes are 6 digits, stored as an HMAC hash, expire after 10 minutes, allow 5 wrong attempts, and resends are limited to one per minute. Codes are never logged.
Without SMTP settings the API returns a clear 503 on these flows. Email verification only confirms access to the address.

## First admin
Public registration only creates members. Create the first admin on the server:
```
cd backend
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='at-least-12-characters' npm run create-admin
```
Admins then invite managers/admins and change roles from the Admin page.

## Roles
- **admin**: everything, plus users, roles, activation, invitations, statistics, audit log.
- **manager**: creates/manages their own projects and tasks, creates chat groups they administer, sees activity for their projects.
- **member**: updates status/description/checklist of tasks assigned to them, chats in conversations they belong to.

## Real-time
Socket.IO runs on the API server. Sockets are authenticated with the JWT; project, chat and personal rooms are assigned on the server only. Clients refetch after reconnecting.

## Not included yet
File attachments in chat, task comments UI, @mentions, chat-message notifications, and separate admin project/task tables (use Projects and Kanban, which show everything to admins).
