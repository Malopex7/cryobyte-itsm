You are an expert Senior Full-Stack Engineer specializing in enterprise IT Service Management (ITSM) architectures and the MERN stack.

Your task is to build a production-ready ITSM system called "Overwatch" for an IT Support startup named "CryoByte PTY LTD". The system must be developed entirely within a strict MERN stack workspace environment, utilizing real-time reactivity, native database job scheduling, and binary large object storage streams.

### 1. Technology Stack Constraints & Core Rules

- **Frontend:** React.js (Single Page Application/PWA) using functional components and Tailwind CSS.
- **Backend:** Node.js with Express.js REST API.
- **Database:** MongoDB (with active replica sets to support Change Streams).
- **Storage:** MongoDB GridFS (`GridFSBucket`) for handling large text logs, memory dumps, and attachments natively without disk writes.
- **Real-Time Layer:** WebSockets via Socket.io for immediate server-to-client UI pushes.
- **Job Scheduling:** Agenda.js (MongoDB-backed background worker) for checking SLA targets.
- **Date/Time Handling:** Native JS Dates or `date-fns`, strictly locked to South African Standard Time (SAST / UTC+2).
- **UI Design System:** High-contrast solid colors only. Avoid gradients. Clean, technical aesthetics utilizing flat design paradigms.

### 2. Core Functional Requirements & Architectures

#### A. Ingestion & Call Logging Pipeline

Implement three explicit intake vectors that resolve into standard JSON ticket payloads:

1. **SendGrid Inbound Parse Webhook:** An Express route (`/api/v1/tickets/webhook/email`) that parses inbound multi-part email forms. It must extract the body text into the description field, map the sender to a `clientId`, and stream attachments directly into GridFS, attaching the generated files' `ObjectId`s to the ticket.
2. **Client React Portal Form:** A structured form requiring impact and urgency mapping, field validation, and multi-file attachment uploading directly to Express chunk-streaming routes. Do not include unrequested hero sections.
3. **ChatOps API Hook:** A lightweight endpoint (`/api/v1/tickets/webhook/chatops`) designed to receive webhook payloads from Slack/Teams slash commands (`/cryosupport`), auto-populating fields and sending a real-time JSON confirmation back.

#### B. Impact vs. Urgency Priority Matrix

The application must evaluate a 3x3 client-side and server-side matrix to automatically assign ticket priority. Users cannot select P1-P4 directly:

- **Impact Options:** 1 (Just Me), 2 (My Department), 3 (Whole Company).
- **Urgency Options:** 1 (Workaround exists/Slow), 2 (Severely Degraded), 3 (Completely Blocked).
- **Mapping Logic:** - Impact 3 + Urgency 3 = **P1 (Critical)**
  - Impact 3 + Urgency 2 or Impact 2 + Urgency 3 = **P2 (High)**
  - Impact 2 + Urgency 2 or Impact 1 + Urgency 3 = **P3 (Medium)**
  - All other combinations = **P4 (Low)**

#### C. Dual-Clock SLA Engine

Implement a robust business hours vs. calendar hours engine using the following matrix:

- **P1 Tickets (Calendar Hours):** 24/7/365 execution. Acknowledgement target = 15 minutes; Resolution target = 2 hours. Math is purely linear (`Date.now() + duration`).
- **P2 to P4 Tickets (Business Hours):** Mon-Fri, 08:00 to 17:00 SAST. Clocks must freeze outside these hours, on weekends, and on South African public holidays.
- **SLA Pause Mechanics:** When ticket status changes to "Waiting on Client", capture the `pausedAt` timestamp. When status reverts to "In Progress", calculate the delta minutes and use MongoDB's `$inc` operator to push the `ackTarget` and `resolveTarget` timestamps forward.

#### D. The Real-Time "War Room" & UI Locking

- Set up a MongoDB Change Stream on the `tickets` collection watching for `update` operations.
- When an update occurs, the Node server intercepts the change and broadcasts it via Socket.io to the affected technician queues.
- Implement field-level presence: when Technician A focuses on a resolution field, emit a Socket.io event that disables that input field on Technician B’s UI with an indicator: "Technician A is typing...".

#### E. Native SLA Enforcement Worker

Set up Agenda.js to process background jobs every 60 seconds:

- Scan for active, unresolved tickets where `sla.resolveTarget` or `sla.ackTarget` is less than the current time.
- Update flags `sla.ackBreached: true` or `sla.resolveBreached: true`.
- Let the Change Stream catch this mutation, forcing the React UI row to immediately blink red using Tailwind animations without requiring a page refresh.

#### F. GridFS Streaming Previews

Build an Express asset controller (`/api/v1/assets/:fileId/stream`) using `GridFSBucket.openDownloadStream(ObjectId(fileId))`. Pipe the binary chunks directly into the Express response with the proper `Content-Type` headers so images, text logs, and PDFs can be streamed and rendered directly inside the React technician dashboard without disk writes.

### 3. Data Models & Schemas

#### Ticket Collection (`tickets`)

```json
{
  "_id": "ObjectId",
  "ticketId": "String (Auto-incrementing prefix format e.g., INC-1001)",
  "clientId": "ObjectId (References clients collection)",
  "assignedTechnicianId": "ObjectId (References users collection, optional)",
  "subject": "String",
  "description": "String",
  "status": "String (Enum: ['New', 'In Progress', 'Waiting on Client', 'Resolved', 'Closed'])",
  "priority": "String (Enum: ['P1', 'P2', 'P3', 'P4'])",
  "matrix": { "impact": "Number", "urgency": "Number" },
  "sla": {
    "ackTarget": "Date",
    "resolveTarget": "Date",
    "ackBreached": "Boolean (Default: false)",
    "resolveBreached": "Boolean (Default: false)",
    "pausedAt": "Date (Optional)",
    "pausedTotalMinutes": "Number (Default: 0)"
  },
  "attachments": [
    {
      "fileId": "ObjectId (References fs.files)",
      "filename": "String",
      "contentType": "String"
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```
