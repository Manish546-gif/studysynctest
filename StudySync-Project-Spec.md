# StudySync – Real-Time Collaborative Study Platform

## Refined Project Overview

StudySync is a real-time collaborative web platform that lets students create or join topic-based study rooms using a unique room code. Inside a room, participants can chat live, draw together on a shared whiteboard, edit notes collaboratively, share files, and hold voice/video calls — turning remote group study into a single, unified workspace instead of five different tabs (Zoom + Google Docs + WhatsApp + Miro + Drive).

**Target users:** students and small study groups (2–15 people per room) who need lightweight, no-signup-friction collaboration.

**Core value proposition:** one room code → full study session (talk, draw, write, share, review later).

---

## Core Features (Detailed)

### 1. User Authentication (JWT)
- Register/Login with email + password (bcrypt hashing)
- JWT access token (short-lived, ~15 min) + refresh token (long-lived, ~7 days, httpOnly cookie)
- Optional: Google OAuth login
- Protected routes via auth middleware
- Password reset via email (Nodemailer + token link)
- Basic rate limiting on auth endpoints (brute-force protection)

### 2. Create & Join Study Rooms
- Room created with: name, subject/tag, max participants, public/private toggle, optional room password
- Unique 6-character alphanumeric room code (collision-checked)
- Join via room code or invite link
- Room lobby showing current participants before entry
- Auto-expire inactive rooms after X hours (cron/TTL index in MongoDB)

### 3. Real-Time Collaborative Whiteboard
- Canvas-based drawing (pen, shapes, eraser, text, color picker, stroke width)
- Multi-user cursor presence (see who's drawing where)
- Undo/redo (per-user and global stack)
- Socket.IO broadcasts stroke events in real time
- Persist whiteboard state as JSON (stroke list) to MongoDB, not just image — allows re-editing later
- Export whiteboard as PNG/PDF

### 4. Live Group Chat
- Real-time text chat per room (Socket.IO)
- Message history persisted in MongoDB, paginated on load
- Typing indicators, read receipts (optional)
- @mentions and emoji reactions (stretch goal)
- System messages (e.g., "Alex joined the room")

### 5. Voice/Video Calling (WebRTC)
- Peer-to-peer via WebRTC, signaling handled over Socket.IO
- Mesh topology for small rooms (≤6 users); recommend SFU (e.g., mediasoup) if scaling beyond that
- Mute/unmute, camera on/off, screen share
- STUN/TURN server required for NAT traversal (coturn self-hosted or a managed TURN provider — critical, WebRTC will fail behind many NATs without this)

### 6. File Sharing (PDF, PPT, Images)
- Upload to Cloudinary (or S3-compatible alternative)
- File type + size validation (client and server side)
- In-room file list with preview (PDF.js for PDFs, image thumbnails)
- Download + delete (owner/uploader only)

### 7. Shared Notes Editor
- Real-time collaborative rich-text editor
- Recommended: Tiptap or Quill + Yjs (CRDT) for conflict-free concurrent editing — plain Socket.IO broadcast is not sufficient once 2+ people type simultaneously
- Autosave to MongoDB at intervals + on disconnect
- Markdown export

### 8. Room Owner Controls
- Kick/ban participant
- Mute participant (chat and/or mic)
- Promote co-host
- Lock room (prevent new joins)
- Transfer ownership if owner leaves

### 9. Save Whiteboard & Notes
- Manual "Save Snapshot" + autosave every N seconds
- Version history (last N snapshots retrievable)

### 10. Study Session History
- Per-user dashboard listing past rooms joined, with date, duration, participants
- Reopen saved whiteboard/notes in read-only or continue-editing mode
- Basic analytics: total study time, most active subjects (stretch goal)

---

## Perfected Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend Framework | **React.js (Vite)** | Faster dev/build than CRA |
| Styling | **Tailwind CSS** + shadcn/ui | Utility-first + accessible prebuilt components |
| State Management | **Zustand** (or Redux Toolkit if team prefers) | Lightweight, less boilerplate than Redux |
| Realtime Client | **Socket.IO client** | Matches backend |
| Whiteboard Rendering | **Fabric.js** or **Konva.js** | Battle-tested canvas abstraction, easier than raw Canvas API |
| Notes Editor | **Tiptap + Yjs + y-websocket** | CRDT-based real-time collab editing, avoids merge conflicts |
| Video/Audio | **WebRTC** via **simple-peer** or raw RTCPeerConnection | Simplifies peer connection boilerplate |
| Backend Framework | **Node.js + Express.js** | As specified |
| Realtime Server | **Socket.IO server** | As specified |
| Database | **MongoDB + Mongoose** | As specified; schema flexibility fits chat/whiteboard JSON blobs |
| Caching / Presence | **Redis** | Socket.IO adapter for multi-instance scaling + presence/typing state |
| Auth | **JWT (jsonwebtoken) + bcrypt** | As specified |
| File Storage | **Cloudinary** | As specified; handles image/PDF transforms + CDN |
| TURN/STUN | **coturn** (self-hosted) or **Twilio/Metered TURN** | Required for WebRTC to work reliably across networks |
| Validation | **Zod** (shared frontend/backend schemas) | Type-safe request validation |
| API Docs | **Swagger/OpenAPI** | Optional but recommended for team handoff |
| Testing | **Jest + React Testing Library** (frontend), **Jest + Supertest** (backend) | Standard combo |
| Deployment | **Frontend: Vercel** · **Backend: Render/Railway** · **DB: MongoDB Atlas** · **Redis: Upstash** | Free-tier-friendly for MVP |
| Env/Secrets | **dotenv** | Standard |
| Logging | **Winston** or **Pino** | Production error/debug tracing |

**Notes on stack decisions worth flagging to your team:**
- Plain Socket.IO broadcast works fine for chat and whiteboard strokes but is *not* safe for the notes editor once multiple people type in the same paragraph simultaneously — that's why Yjs (CRDT) is recommended there instead of naive event broadcasting.
- WebRTC mesh (every peer connects to every peer) only scales to ~4-6 participants before bandwidth/CPU degrade on each client; if group video is a priority beyond that, budget time for an SFU like mediasoup or LiveKit.
- Redis becomes necessary the moment you run more than one backend instance, since Socket.IO needs a shared adapter to broadcast across instances.

---

## Project File Structure

```
studysync/
├── client/                          # React frontend
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   ├── RegisterForm.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── room/
│   │   │   │   ├── RoomLobby.jsx
│   │   │   │   ├── RoomHeader.jsx
│   │   │   │   ├── ParticipantList.jsx
│   │   │   │   └── OwnerControlsPanel.jsx
│   │   │   ├── whiteboard/
│   │   │   │   ├── WhiteboardCanvas.jsx
│   │   │   │   ├── WhiteboardToolbar.jsx
│   │   │   │   └── CursorOverlay.jsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatBox.jsx
│   │   │   │   ├── ChatMessage.jsx
│   │   │   │   └── TypingIndicator.jsx
│   │   │   ├── notes/
│   │   │   │   ├── NotesEditor.jsx
│   │   │   │   └── NotesVersionHistory.jsx
│   │   │   ├── calls/
│   │   │   │   ├── VideoGrid.jsx
│   │   │   │   ├── CallControls.jsx
│   │   │   │   └── ScreenShareButton.jsx
│   │   │   ├── files/
│   │   │   │   ├── FileUpload.jsx
│   │   │   │   ├── FileList.jsx
│   │   │   │   └── FilePreview.jsx
│   │   │   ├── dashboard/
│   │   │   │   ├── SessionHistoryList.jsx
│   │   │   │   └── SessionCard.jsx
│   │   │   └── common/
│   │   │       ├── Navbar.jsx
│   │   │       ├── Button.jsx
│   │   │       ├── Modal.jsx
│   │   │       └── Loader.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreateRoom.jsx
│   │   │   ├── JoinRoom.jsx
│   │   │   ├── RoomPage.jsx
│   │   │   └── NotFound.jsx
│   │   ├── hooks/
│   │   │   ├── useSocket.js
│   │   │   ├── useAuth.js
│   │   │   ├── useWhiteboard.js
│   │   │   ├── useWebRTC.js
│   │   │   └── useNotesSync.js
│   │   ├── store/
│   │   │   ├── authStore.js
│   │   │   ├── roomStore.js
│   │   │   └── chatStore.js
│   │   ├── services/
│   │   │   ├── api.js                # axios instance + interceptors
│   │   │   ├── authService.js
│   │   │   ├── roomService.js
│   │   │   ├── fileService.js
│   │   │   └── socketService.js
│   │   ├── utils/
│   │   │   ├── constants.js
│   │   │   ├── validators.js
│   │   │   └── formatters.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                 # Tailwind directives
│   ├── .env.example
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                          # Node/Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 # MongoDB connection
│   │   │   ├── redis.js
│   │   │   ├── cloudinary.js
│   │   │   └── env.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Room.js
│   │   │   ├── Message.js
│   │   │   ├── Whiteboard.js
│   │   │   ├── Note.js
│   │   │   ├── FileAsset.js
│   │   │   └── SessionHistory.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── roomController.js
│   │   │   ├── chatController.js
│   │   │   ├── whiteboardController.js
│   │   │   ├── noteController.js
│   │   │   ├── fileController.js
│   │   │   └── historyController.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── roomRoutes.js
│   │   │   ├── chatRoutes.js
│   │   │   ├── whiteboardRoutes.js
│   │   │   ├── noteRoutes.js
│   │   │   ├── fileRoutes.js
│   │   │   └── historyRoutes.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # verify JWT
│   │   │   ├── roleMiddleware.js     # owner/co-host checks
│   │   │   ├── errorHandler.js
│   │   │   ├── rateLimiter.js
│   │   │   └── validateRequest.js    # Zod schema validation
│   │   ├── sockets/
│   │   │   ├── index.js              # Socket.IO init + Redis adapter
│   │   │   ├── roomSocket.js         # join/leave/presence events
│   │   │   ├── chatSocket.js
│   │   │   ├── whiteboardSocket.js
│   │   │   ├── notesSocket.js        # Yjs sync events
│   │   │   └── webrtcSignalSocket.js # offer/answer/ICE relay
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── roomCodeGenerator.js
│   │   │   ├── emailService.js
│   │   │   └── cloudinaryService.js
│   │   ├── validators/
│   │   │   ├── authSchema.js
│   │   │   ├── roomSchema.js
│   │   │   └── fileSchema.js
│   │   ├── utils/
│   │   │   ├── logger.js             # Winston/Pino setup
│   │   │   ├── generateTokens.js
│   │   │   └── apiResponse.js
│   │   ├── app.js                    # Express app setup
│   │   └── server.js                 # HTTP + Socket.IO bootstrap
│   ├── .env.example
│   └── package.json
│
├── turn-server/                     # optional: coturn config if self-hosting TURN
│   └── turnserver.conf
│
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── ER-DIAGRAM.png
│
├── .gitignore
├── docker-compose.yml               # spins up client, server, mongo, redis, coturn locally
└── README.md
```

---

## UI/UX Design Direction — "Calm Shell, Playful Canvas"

The brief is essentially two products in one: **Notion's** calm, document-first workspace (dashboard, notes, chat) fused with **Miro's** spatial, playful whiteboard energy. Rather than picking one language for the whole app, the design should let the *app shell* feel like Notion and let the *whiteboard* break out into Miro's world — stitched together by one consistent idea: **every collaborator has a single color that follows them everywhere.**

### Color Tokens
| Name | Hex | Use |
|---|---|---|
| Paper | `#F7F8FA` | App background — cool neutral, not the cliché warm cream |
| Ink | `#1F2328` | Primary text |
| Line | `#E3E5E8` | Hairline borders, dividers, table/block edges |
| Muted | `#6B7280` | Secondary text, timestamps, placeholders |
| Signal Violet | `#6B5CE0` | Primary interactive accent (buttons, links, active states) — deliberately not the default blue or terracotta |
| Sticky Yellow | `#FFD84D` | Whiteboard-only accent — sticky notes, highlights, the "Miro" register |

**Presence palette** (one hue permanently assigned per user, used consistently across the whole app): Coral `#FF6B6B` · Teal `#2EC4B6` · Violet `#6B5CE0` · Sky `#3D8BFF` · Yellow `#FFD84D` · Green `#4CD787`.

### Typography
- **Display / headings:** Instrument Sans — geometric but slightly warm, gives the product a distinct voice instead of default Inter-everywhere
- **Body / UI text:** Inter — disappears into the background for long note-taking and chat, which is what body text should do
- **Room codes, timestamps, technical labels:** IBM Plex Mono — a small but deliberate detail: the 6-character room code becomes a memorable, "type this in" artifact rather than looking like a UUID fragment

### Layout Concept
```
┌─ Sidebar (Notion register) ─┬────────── Main content ──────────┐
│ ○ Dashboard                 │  Room: Organic Chem Study  #7F2K9Q │
│ ○ My Rooms                  │  ─────────────────────────────────│
│ ○ Join by code [______]     │  [Whiteboard] [Notes] [Chat] tabs  │
│                              │                                    │
│ ● Priya  ● Sam  ● Devi      │        (content swaps below,       │
│  (presence dots, calm)      │         calm block layout,         │
│                              │         hairline dividers)         │
└──────────────────────────────┴────────────────────────────────────┘
```

When the **Whiteboard tab** is active, the calm content frame recedes and the canvas breaks out to full-bleed:
```
┌────────────────────────────────────────────────────────────┐
│ · · · · · · · · · ·   (dot-grid, infinite-canvas feel)      │
│ · · ┌─────────┐· · ·        ↖ Priya's cursor (coral)        │
│ · · │ sticky  │· · · · · · · · · · · · · · · · · · · · · ·  │
│ · · │ note    │· · ·   ┌──────────┐                         │
│ · · └─────────┘· · · · │  drawing │  ↖ Sam's cursor (teal)  │
│ · · · · · · · · · · · ·└──────────┘· · · · · · · · · · · ·  │
│         [floating toolbar: pen · shape · text · color · undo]│
└────────────────────────────────────────────────────────────┘
```
Notes and Chat stay inside the calm Notion-style block frame (generous whitespace, 1px borders instead of shadows, no heavy chrome) since those are reading/writing tasks, not spatial ones.

### Signature Element
**Presence threading.** A user's assigned color shows up everywhere they touch the product: their avatar ring in the sidebar, their cursor label on the whiteboard, a thin colored left-border on chat messages they send, and a soft colored highlight on notes blocks they're actively editing. It's the one throughline that makes the calm half and the playful half of the app feel like the same product, and it doubles as a live "who's doing what" indicator without extra UI.

### Interaction Notes
- Buttons/links use Signal Violet; Sticky Yellow is reserved only for whiteboard elements so it keeps its "canvas" meaning
- Motion: one orchestrated moment (cursors gliding smoothly on the whiteboard via interpolation) rather than scattered micro-animations elsewhere in the app
- Empty states written in plain, direct language ("No rooms yet — create one or join with a code" rather than generic placeholder copy)
- Keyboard focus states visible throughout; whiteboard toolbar and room controls fully usable via keyboard for accessibility

### Ready-to-use prompt (for handing to a design/build tool)
> Design StudySync, a study-room collaboration app, as a fusion of Notion's calm document workspace and Miro's playful infinite whiteboard. Use a cool neutral `#F7F8FA` background, near-black `#1F2328` text, a violet `#6B5CE0` primary accent for the calm shell, and a yellow `#FFD84D` accent reserved for the whiteboard canvas only. Pair Instrument Sans headings with Inter body text, and set room codes/timestamps in IBM Plex Mono. The sidebar, dashboard, notes editor, and chat should feel like Notion: hairline borders, generous whitespace, no shadows. The whiteboard tab should break out into a full-bleed dot-grid infinite canvas with a floating toolbar, in Miro's spirit. Every collaborator gets one consistent color used for their sidebar avatar ring, whiteboard cursor, chat message border, and active-notes-block highlight, so the two halves of the app read as one product.

---

## Suggested Build Order (for reference)
1. Auth (register/login/JWT) + protected routes
2. Room create/join + Socket.IO room presence
3. Live chat (proves real-time pipeline works end-to-end)
4. Whiteboard sync
5. File sharing
6. Notes editor (Yjs)
7. WebRTC voice/video + TURN setup
8. Owner controls, save/history features
9. Polish, error handling, deployment
