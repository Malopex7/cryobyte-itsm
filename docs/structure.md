# Overwatch ITSM - System Specification & AI Master Prompt

This document serves as the absolute single source of truth for the development of **Overwatch**, an enterprise-grade real-time IT Service Management (ITSM) system built for **CryoByte PTY LTD**.

---

## Part 1: System Directory Structure

Below is the complete, production-ready workspace file layout. The project enforces a strict separation between the `frontend` (React client application) and the `backend` (Node/Express API and background workers).

```text
cryobyte-itsm/
├── frontend/               # React.js Frontend (SPA/PWA)
│   ├── public/             # Static assets
│   │   ├── manifest.json   # PWA compliance configuration
│   │   └── index.html
│   └── src/
│       ├── assets/         # Global styling configurations
│       │   └── tailwind.css
│       ├── components/     # Reusable, decoupled UI elements
│       │   ├── common/
│       │   │   ├── Button.jsx
│       │   │   ├── Modal.jsx
│       │   │   └── StatusBadge.jsx
│       │   ├── forms/
│       │   │   ├── FileUpload.jsx    # React dropzone processing GridFS payloads
│       │   │   └── TicketForm.jsx    # Form exposing the Impact/Urgency selectors
│       │   ├── tickets/
│       │   │   ├── TicketCard.jsx    # Dashboard real-time row element
│       │   │   ├── SlaCountdown.jsx  # Client-side countdown visual module
│       │   │   └── AssetPreview.jsx  # Inline viewer for text, images, and PDFs
│       │   └── layout/
│       │       ├── Sidebar.jsx
│       │       ├── Topbar.jsx
│       │       └── WarRoomBanner.jsx # Real-time P1 event banner notification
│       ├── contexts/       # Central state stores
│       │   ├── AuthContext.jsx
│       │   └── SocketContext.jsx # Central Socket.io event loop pipeline
│       ├── hooks/          # Reusable lifecycle wrappers
│       │   ├── useSocket.js    # Interceptor for backend change stream emissions
│       │   └── useSlaMath.js   # Dynamic time calculation utility for local renders
│       ├── pages/          # Dedicated routing interfaces
│       │   ├── auth/
│       │   │   └── Login.jsx
│       │   ├── portal/         # External customer viewports
│       │   │   ├── SubmitTicket.jsx
│       │   │   └── MyTickets.jsx
│       │   └── technician/     # Internal workforce viewports
│       │       ├── Dashboard.jsx     # Master real-time queue interface
│       │       ├── TicketDetail.jsx  # Interactive live ticket interaction sheet
│       │       └── Settings.jsx      # Portal threshold configurations
│       ├── services/       # Direct server network transport bindings
│       │   ├── api.js          # Unified Axios wrapper instances
│       │   ├── ticketApi.js
│       │   └── assetApi.js     # Pulls files down from GridFS routes
│       ├── utils/          # Client-side processing tools
│       │   ├── priorityMatrix.js # Client-side runtime verification for matrix maps
│       │   └── formatters.js   # Date serialization and timezone alignment
│       ├── App.jsx         # Top-level routing orchestration layer
│       └── main.jsx        # Core application injection point
│   ├── .env                # Host configuration targets (VITE_API_URL)
│   ├── package.json
│   ├── tailwind.config.js  # Priority coloring overrides and custom flat UI palettes
│   └── vite.config.js      # Deployment assembly directives
│
├── backend/                # Node.js + Express Backend
│   ├── config/             # Application initializers
│   │   ├── db.js           # MongoDB connection & GridFS bucket initialization
│   │   ├── agenda.js       # Agenda.js setup for background processing
│   │   └── socket.js       # Socket.io server configuration
│   ├── controllers/        # Route controllers handling incoming payloads
│   │   ├── authController.js
│   │   ├── ticketController.js # Core logic for ticket lifecycles and SLA shifts
│   │   └── assetController.js  # GridFS chunk-streaming controller
│   ├── jobs/               # Scheduled tasks managed by Agenda.js
│   │   ├── slaWatchdog.js  # One-minute interval worker scanning for breaches
│   │   └── index.js        # Central job registry
│   ├── middlewares/        # Request interception layers
│   │   ├── auth.js         # JWT verification and role enforcement
│   │   ├── errorHandler.js # Centralized API catch-all error handling
│   │   └── upload.js       # Multer memory storage configuration for file uploads
│   ├── models/             # Mongoose schema definitions
│   │   ├── Ticket.js       # Includes priority matrix state and absolute targets
│   │   ├── User.js         # Support technicians and administrative staff
│   │   └── Client.js       # Business profile documents
│   ├── routes/             # Routing endpoints
│   │   ├── api/v1/
│   │   │   ├── authRoutes.js
│   │   │   ├── ticketRoutes.js
│   │   │   └── assetRoutes.js  # GridFS retrieval endpoints
│   │   └── webhooks/       # External integration webhooks
│   │       ├── emailParse.js   # Inbound SendGrid payload processing
│   │       └── chatOps.js      # Inbound chat command integrations
│   ├── services/           # Decoupled domain business logic
│   │   ├── slaEngine.js    # The business vs. calendar dual-clock algorithm
│   │   └── holidays.json   # SAST public holidays calendar configuration
│   ├── sockets/            # Real-time event communication
│   │   ├── changeStreams.js # Database mutation listeners targeting Socket.io events
│   │   └── eventHandlers.js # Real-time UI locks and field presence events
│   ├── utils/              # Shared helper scripts
│   │   └── logger.js       # Structured logging configuration
│   ├── .env                # Secret values and execution variables
│   ├── package.json
│   └── backend.js          # Server entry point
│
├── .gitignore
├── package.json            # Root workspace package management
└── README.md
```
