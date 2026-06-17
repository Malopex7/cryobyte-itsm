# 🗺️ Overwatch ITSM - Implementation Roadmap

This document outlines the step-by-step roadmap to complete the development of the **Overwatch** ITSM system. Each item contains specific file targets and technical constraints.

---

## 🔑 Phase 1: Authentication, Access Control & Database Models
Establish the security foundation and schema architecture.

- [x] **Install Dependencies**
  - Backend: `npm install socket.io` (Complete)
  - Frontend: `npm install socket.io-client` (Complete)
- [x] **Core Ticket Schema**
  - File: `backend/src/models/Ticket.js` (Complete)
- [ ] **User & Client Schemas**
  - [x] Implement `User.js` Mongoose schema (Roles: `Client`, `Technician`, `Admin`).
  - [ ] Implement `Client.js` Mongoose schema (Company details, SLAs).
  - Files:
    - [NEW] [User.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/models/User.js)
    - [NEW] [Client.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/models/Client.js)
- [ ] **Authentication Middleware & JWT Lifecycle**
  - [ ] Implement bcrypt password hashing & JWT token generation.
  - [ ] Implement role validation middleware (`requireRole(['Technician', 'Admin'])`).
  - Files:
    - [NEW] [auth.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/middlewares/auth.js)
    - [NEW] [authController.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/controllers/authController.js)
    - [NEW] [authRoutes.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/routes/api/v1/authRoutes.js)

---

## 📤 Phase 2: Ingestion Pipeline & GridFS Large Object Storage
Set up filesystems and multiple entry channels for ticket creation.

- [ ] **GridFS Engine Setup**
  - [ ] Configure Multer storage engine piping uploads directly into Mongo `GridFSBucket`.
  - [ ] Implement chunk-streaming preview endpoint `/api/v1/assets/:fileId/stream` handling proper Content-Types.
  - Files:
    - [NEW] [upload.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/middlewares/upload.js)
    - [NEW] [assetController.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/controllers/assetController.js)
    - [NEW] [assetRoutes.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/routes/api/v1/assetRoutes.js)
- [ ] **SendGrid Inbound Email Webhook**
  - [ ] Route `/api/v1/tickets/webhook/email` parsing email parameters.
  - [ ] Auto-link sender email to `clientId` and stream email attachments directly to GridFS.
  - File:
    - [NEW] [emailParse.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/routes/webhooks/emailParse.js)
- [ ] **ChatOps Slash Commands API**
  - [ ] Route `/api/v1/tickets/webhook/chatops` designed for Slack/Teams hooks.
  - [ ] Parse slash inputs and return structured JSON confirmations.
  - File:
    - [NEW] [chatOps.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/routes/webhooks/chatOps.js)

---

## ⏰ Phase 3: Dual-Clock SLA Engine & Background Workers
Implement business calendar logic and automated SLA breach checks.

- [ ] **Holiday Calendar and SAST Local Time Configuration**
  - [ ] Define South African Standard Time (SAST / UTC+2) constraints.
  - [ ] Create public holiday JSON database matching SA calendar.
  - File:
    - [NEW] [holidays.json](file:///d:/cursor-dev/cryobyte-itsm/backend/src/services/holidays.json)
- [ ] **SLA Calculations Engine**
  - [ ] **P1 Calendar Clock:** Linear duration math (24/7/365).
  - [ ] **P2-P4 Business Clock:** Mon-Fri, 08:00 to 17:00 SAST clock freezing.
  - [ ] **Pause/Resume Mechanics:** Push targets forward by exact delta minutes when ticket status shifts out of `Waiting on Client`.
  - File:
    - [NEW] [slaEngine.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/services/slaEngine.js)
- [ ] **Agenda.js Background Watchdog Worker**
  - [ ] Run 60-second cron checks identifying active tickets passing `ackTarget` or `resolveTarget`.
  - [ ] Mutate flags `sla.ackBreached: true` / `sla.resolveBreached: true`.
  - Files:
    - [NEW] [agenda.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/config/agenda.js)
    - [NEW] [slaWatchdog.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/jobs/slaWatchdog.js)
    - [NEW] [jobs/index.js](file:///d:/cursor-dev/cryobyte-itsm/backend/src/jobs/index.js)

---

## ⚡ Phase 4: Sockets and Change Streams Real-Time Sync
Implement live UI updates and locking.

- [x] **Socket.io Core Server**
  - File: `backend/src/config/socket.js` (Complete)
- [x] **Mongoose Change Stream Watcher**
  - File: `backend/src/sockets/changeStreams.js` (Complete)
- [x] **Field Presence & Locks Handlers**
  - File: `backend/src/sockets/eventHandlers.js` (Complete)
- [x] **Frontend Socket context & Hook**
  - Files:
    - `frontend/src/contexts/SocketContext.tsx` (Complete)
    - `frontend/src/hooks/useSocket.ts` (Complete)

---

## 🎨 Phase 5: Frontend Pages, State & Live Dashboard UI
Build the high-contrast technical UI interfaces.

- [ ] **Global Store (Zustand)**
  - [ ] Manage ticket states, filtering, loading states, and auth sessions.
  - File:
    - [MODIFY] [store.ts](file:///d:/cursor-dev/cryobyte-itsm/frontend/src/store.ts)
- [ ] **Technician Live Dashboard & Queues**
  - [ ] Real-time incident list sorting P1s to top.
  - [ ] Blinking red row animation using Tailwind CSS if `sla.resolveBreached` or `sla.ackBreached` is true.
  - [ ] Real-time SLA countdown clocks reflecting SAST timezone.
  - Files:
    - [NEW] [Dashboard.jsx](file:///d:/cursor-dev/cryobyte-itsm/frontend/src/pages/technician/Dashboard.jsx)
    - [NEW] [SlaCountdown.jsx](file:///d:/cursor-dev/cryobyte-itsm/frontend/src/components/tickets/SlaCountdown.jsx)
- [ ] **Technician Detail Sheet & UI Locking Integration**
  - [ ] Bind focus/blur textarea listeners to Socket.io to lock/unlock fields.
  - [ ] Render "Lock indicator" when other users are editing resolution inputs.
  - [ ] Stream attachment previews inline (PDF, text, images).
  - Files:
    - [NEW] [TicketDetail.jsx](file:///d:/cursor-dev/cryobyte-itsm/frontend/src/pages/technician/TicketDetail.jsx)
    - [NEW] [AssetPreview.jsx](file:///d:/cursor-dev/cryobyte-itsm/frontend/src/components/tickets/AssetPreview.jsx)
- [ ] **Client Intake Portal**
  - [ ] File dropzone module uploading files directly to Express GridFS endpoints.
  - [ ] Interactive 3x3 urgency/impact grid matrix selectors.
  - Files:
    - [NEW] [SubmitTicket.jsx](file:///d:/cursor-dev/cryobyte-itsm/frontend/src/pages/portal/SubmitTicket.jsx)
    - [NEW] [FileUpload.jsx](file:///d:/cursor-dev/cryobyte-itsm/frontend/src/components/forms/FileUpload.jsx)

---

## 📦 Phase 6: PWA Integration, Optimization & Final Polish
Refine performance, styles, and offline accessibility.

- [ ] **PWA & Manifest Configuration**
  - [ ] Setup Service Worker caching for offline ticket views.
  - [ ] Create manifest configurations.
  - File:
    - [NEW] [manifest.json](file:///d:/cursor-dev/cryobyte-itsm/frontend/public/manifest.json)
- [ ] **Vite Production Bundling Verification**
  - [ ] Run production builds and ensure zero TypeScript errors (`tsc --noEmit`).
