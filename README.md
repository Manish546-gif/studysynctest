# StudySync

A real-time collaborative study platform with video conferencing, live chat, and a multi-user whiteboard.

## Features

- **Authentication** — Email/password signup & login with JWT, plus Google OAuth
- **Rooms** — Create study rooms, join via 6-character room codes, invite members
- **Real-time video/voice chat** — WebRTC peer-to-peer with Socket.IO signaling, STUN-based NAT traversal
- **Live chat & presence** — Socket.IO room chat with message history, online member list
- **Collaborative whiteboard** — Multi-user drawing with live path streaming, sticky notes, text, undo, eraser, zoom/pan
- **File sharing** — Upload PDFs, images, docs (GridFS storage), inline preview, download & delete
- **Productivity tools** — Pomodoro timer, screen recorder, calendar & session history

## Tech Stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React 19, Vite, Framer Motion, Tailwind CSS, Socket.IO client |
| Backend   | Node.js, Express, Socket.IO, Multer |
| Database  | MongoDB + Mongoose, GridFS for file storage |
| Auth      | JWT, Google OAuth 2.0 |

## Getting Started

1. **Server** (`/server`):
   ```
   npm install
   cp .env.example .env   # set MONGODB_URI, JWT_SECRET, GOOGLE_CLIENT_ID
   npm start
   ```

2. **Client** (`/client`):
   ```
   npm install
   npm run dev
   ```

Open `http://localhost:5173`, create an account, create a room, and share the code.

## Project Structure

- `server/` — Express API, Socket.IO real-time layer, Mongoose models, GridFS file storage
- `client/` — React SPA: pages, WebRTC/socket hooks, whiteboard component, UI components
