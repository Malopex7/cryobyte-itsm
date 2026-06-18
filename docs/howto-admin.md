# CryoByte ITSM — Administrator How-To Guide

> **Audience:** System Administrators  
> **Last Updated:** June 2026

---

## Table of Contents

1. [Accessing the Admin Panel](#1-accessing-the-admin-panel)
2. [System Metrics Overview](#2-system-metrics-overview)
3. [Onboarding a Client Company](#3-onboarding-a-client-company)
4. [User Management](#4-user-management)
   - [Creating a Single User](#41-creating-a-single-user)
   - [Mass User Onboarding via CSV](#42-mass-user-onboarding-via-csv)
   - [Bulk Preview & Import](#43-bulk-preview--import)
   - [Editing a User](#44-editing-a-user)
   - [Deleting a User](#45-deleting-a-user)
   - [Granting Dispatcher Access](#46-granting-dispatcher-access)
5. [Queue Management](#5-queue-management)
   - [Creating a Queue](#51-creating-a-queue)
   - [Editing a Queue](#52-editing-a-queue)
   - [Deleting a Queue](#53-deleting-a-queue)
6. [Ticket Routing & The Dispatcher Flow](#6-ticket-routing--the-dispatcher-flow)
7. [Cross-Assigning Tickets](#7-cross-assigning-tickets)
8. [Priority Management](#8-priority-management)
9. [SLA Configuration](#9-sla-configuration)
10. [Role Reference](#10-role-reference)

---

## 1. Accessing the Admin Panel

1. Log in with an account that has the **Admin** role.
2. Navigate to `/admin` or click **Admin Panel** from the main navigation.
3. The panel is structured as follows (top to bottom):
   - **System Metrics** — live KPI row
   - **Client Onboarding** (left) + **User Management** (right) — two-column grid
   - **Queue Management** — full-width panel below

> **Note:** Only users with the `Admin` role can access this panel. Technicians and Clients receive a `403 Forbidden` response if they attempt to navigate here directly.

> **Note:** Public self-registration (`/register`) is **disabled**. All user accounts must be created by an administrator through this panel. Visitors to `/register` are automatically redirected to `/login`.

---

## 2. System Metrics Overview

The metrics row at the top of the Admin panel provides a live summary:

| Metric | Description |
|---|---|
| **Total Tickets Logged** | Cumulative count of all tickets ever created |
| **Active Incidents** | Tickets currently in `New`, `In Progress`, or `Waiting on Client` status |
| **SLA Compliance Rate** | Percentage of tickets that did not breach any SLA target |
| **Active Technicians** | Number of registered users with the `Technician` role |

---

## 3. Onboarding a Client Company

Each client portal user must be linked to a **Client Company**. Companies also carry their own **SLA targets** (per priority level).

### Steps

1. In the **Onboard Client Company** form (left column), fill in:
   - **Company Name** – must be unique (e.g. `Acme Corp PTY`)
   - **Email Domains** – comma-separated domains used for auto-association (e.g. `acme.com, acme.co.za`)
   - **Contact Email / Phone** – optional administrative contacts
   - **Address** – optional billing/postal address
2. Set custom **SLA Targets** per priority (in minutes):
   - `P1`: Highest urgency/impact — typically 15 min ACK, 120 min Resolve
   - `P2`: High — 60 min ACK, 480 min Resolve
   - `P3`: Medium — 120 min ACK, 1440 min Resolve
   - `P4`: Low — 240 min ACK, 2880 min Resolve
3. Click **Register New Company Profile**.

> **SLA Targets** are applied automatically when a ticket is created for that company. If the priority is later changed by a technician or admin, the SLA clock is recalculated.

---

## 4. User Management

All user accounts are created and managed exclusively by Admins in the **User Management** section (right column of the admin panel). The section is split into two panels:

- **Create Users** — three-tab interface for creating accounts individually or in bulk
- **User Directory** — searchable list of all registered users, with filters for Role and Client Company, and inline edit/delete functionality.

---

### 4.1 Creating a Single User

1. In the **Create Users** panel, ensure the **+ Single User** tab is active.
2. Fill in:
   - **Full Name**
   - **Email Address**
   - **Password** (minimum 6 characters — the user can change this after first login)
   - **Role** — `Technician` (default), `Admin`, or `Client`
3. If `Client` is selected, a **Client Company** dropdown appears — select the company to link the user to.
4. If `Technician` or `Admin` is selected, a **Dispatcher Access** toggle appears (purple when enabled). Toggle it on if this user should be a dispatcher.
5. Click **Create User Account**.

A success message confirms creation and the User Directory refreshes automatically.

---

### 4.2 Mass User Onboarding via CSV

For onboarding multiple users at once (e.g. a new team, department, or client rollout):

1. Click the **↑ CSV Import** tab in the **Create Users** panel.
2. Review the **CSV Format Requirements** shown on screen.
3. Click the upload area to select your `.csv` file (max 500 users per file).

#### Required CSV columns

| Column | Required | Values |
|---|---|---|
| `name` | ✅ | Full display name |
| `email` | ✅ | Unique email address |
| `password` | ✅ | Min 6 characters |
| `role` | ✅ | `Client`, `Technician`, or `Admin` |
| `clientId` | Only for `Client` role | MongoDB ObjectId of the client company |
| `hasAllQueueAccess` | Optional | `true` or `false` |

#### Example CSV

```csv
name,email,password,role
John Doe,john@acme.com,Pass123,Technician
Jane Smith,jane@acme.com,Pass456,Admin
Bob Jones,bob@clientco.com,Pass789,Client,64b3f2...objectId
```

4. After upload, a green banner confirms how many rows were parsed. Click **Review →** to inspect them before submitting.

---

### 4.3 Bulk Preview & Import

1. Click the **⊞ Bulk Preview** tab (or use the **Review →** button after CSV upload).
2. A preview table shows all queued users: row number, name, email, role, and dispatcher flag.
3. Review the list for errors. Click **Clear** to discard and start over, or **Import All** to submit.
4. After import, a result summary is shown:
   - **Created** — successfully provisioned accounts
   - **Failed** — rows that were skipped, with per-row error reasons (e.g. duplicate email, missing field)

> Up to **500 users** can be imported in a single batch.

---

### 4.4 Editing a User

1. Find the user in the **User Directory** (use the search bar to filter by name or email).
2. Click **Edit** on the user card.
3. Modify:
   - **Role** — changing to `Client` reveals a company selector; changing away from `Client` clears it
   - **Company** — only shown when role is `Client`
   - **Dispatcher Access** — toggle shown for `Technician` and `Admin` roles
4. Click **Save Changes**.

> You cannot change a user's name or email from this panel. If required, delete and recreate the account.

---

### 4.5 Deleting a User

1. Click **Delete** on the user card (not shown for your own account — self-deletion is blocked).
2. An inline confirmation appears: **"Delete this user permanently?"**
3. Click **Yes, delete** to confirm, or **No, cancel** to abort.

> **Warning:** Deletion is permanent. Deleted users' tickets remain in the system but will show as `Unassigned`. Consider editing the user's role instead of deleting if you need to preserve auditability.

---

### 4.6 Granting Dispatcher Access

The **Dispatcher** is a special permission (not a separate role) granted to any `Technician` or `Admin`. A dispatcher can:

- See **all** tickets regardless of queue membership
- Access the **⚠ Unqueued** inbox — where all new tickets land before being routed
- Route tickets to specific queues via the **Queue Routing** panel on a ticket

**To grant via Create User form:** Toggle **Dispatcher Access** to `ON` when creating the user.

**To grant to an existing user:**
1. Click **Edit** on the user card.
2. Toggle **DISPATCHER ACCESS** to `✓ ENABLED`.
3. Click **Save Changes**.

**To revoke:** Follow the same steps and toggle it back to `DISABLED`.

> **Best practice:** Assign at least one dispatcher per shift so new tickets are always triaged and routed to the right queue. Without a dispatcher, unqueued tickets are invisible to regular technicians.

---

## 5. Queue Management

Queues (Buckets) are named groups of technicians that tickets are routed into. A technician can only see tickets that belong to their assigned queues.

### 5.1 Creating a Queue

1. Scroll to the **Queue Management** panel at the bottom of the admin page.
2. In the **Create New Queue** form:
   - Enter a **Queue Name** (e.g. `Networking`, `Desktop Support`, `Security`)
   - Pick a **Color** using the colour picker — displayed as a badge on ticket cards and filter tabs
   - Optionally add a **Description**
   - Check the boxes for the **Members** (technicians/admins) who should have access to tickets in this queue. You can use the inline search bar to filter by name, email, or role.
3. Click **Create Queue**.

### 5.2 Editing a Queue

1. In the **Existing Queues** list (right side), find the queue and click **Edit**.
2. Update the **name**, **colour**, and/or **member list** (using the member search filter if needed).
3. Click **Save**.

> Member changes take effect immediately. Technicians removed from a queue lose visibility of its tickets on their next page load.

### 5.3 Deleting a Queue

1. Click **Delete** on the queue card.
2. Confirm the prompt.

> **Warning:** Deleting a queue does not delete the tickets in it — they revert to **Unqueued** status so a dispatcher can re-route them.

---

## 6. Ticket Routing & The Dispatcher Flow

This is the core workflow for how a ticket moves from creation to a technician's workbench:

```
Client logs a ticket
        │
        ▼
  Ticket created with queueId = null ("Unqueued")
        │
        ▼
  Dispatcher sees it in the ⚠ UNQUEUED tab (red badge count)
        │
        ▼
  Dispatcher opens the ticket → selects a Queue from "Queue Routing" dropdown
        │
        ▼
  Ticket is now visible to members of that queue on their dashboard
        │
        ▼
  A technician claims or is cross-assigned the ticket → status → In Progress
```

### Key Points

- **New tickets are always Unqueued** — they land in the dispatcher's inbox, not directly in any queue.
- The **red badge** on the `⚠ UNQUEUED` tab alerts dispatchers to pending items.
- Only **Admins** and users with **Dispatcher Access** can change a ticket's queue.
- Dispatchers can also **cross-assign** a ticket to any technician.

### Dashboard Queue Filter Tabs

On the Technician Dashboard (`/technician/dashboard`), the queue filter tab strip appears at the top of the incident list:

- **ALL QUEUES** — shows every ticket visible to the logged-in user
- **⚠ UNQUEUED** (dispatchers only) — shows all tickets not yet assigned to a queue
- **Queue tabs** (colour-coded) — filter to a specific queue

---

## 7. Cross-Assigning Tickets

By default, technicians can claim tickets for themselves. Cross-assignment allows any staff member to assign a ticket to any other technician.

### How to Cross-Assign

1. Open the ticket in the Technician Console (`/technician/ticket/[id]`).
2. In the **Assignment Console** panel (right column), use the **Assigned Technician** dropdown.
3. Select the target technician — the current user is marked `(me)`.
4. The assignment saves immediately and a system note is added to the audit trail.

### Quick Claim / Release

Below the dropdown:
- **Claim Incident** — assigns the ticket to yourself (one click)
- **Take Over Incident** — reassigns from another tech to yourself
- **Release Incident** — unassigns yourself from the ticket

---

## 8. Priority Management

### How Priority is Calculated

Priority is derived from the **Impact × Urgency matrix**:

| Impact ↓ / Urgency → | Low (1) | Medium (2) | High (3) |
|---|---|---|---|
| **Low (1)** | P4 | P4 | P3 |
| **Medium (2)** | P4 | P3 | P2 |
| **High (3)** | P3 | P2 | P1 |

### Who Can Change Priority

| Role | Can Change? | How Many Times? | When? |
|---|---|---|---|
| **Client** | ❌ Never | — | Defaults to P4 at creation |
| **Technician** | ✅ Once | Once only | Before the ticket is claimed |
| **Admin** | ✅ Unlimited | No limit | Anytime |

- Once a technician uses their one change, the **Update Priority** panel disappears from their view.
- Every priority change generates a **system note** in the Activity Log.
- The **SLA targets are automatically recalculated** when priority changes.

---

## 9. SLA Configuration

SLA targets are configured **per client company** and **per priority level** in minutes:

- **ACK Target** — time allowed to acknowledge (assign) the ticket
- **Resolve Target** — time allowed to fully resolve the ticket

### SLA Pause / Resume

The SLA clock pauses when a ticket is set to `Waiting on Client`:

1. On the ticket detail page, select **Waiting on Client** from the status controls.
2. You will be prompted for a **pause reason** (mandatory).
3. The SLA countdown timer stops.
4. When moved back to `In Progress`, the timer resumes — pause duration is added back to the deadline.

### SLA Breach

When an SLA target is exceeded:
- The ticket card turns **red and pulses** on the dashboard.
- The SLA timer displays in red.
- The **SLA Compliance Rate** metric in the admin panel decreases.

---

## 10. Role Reference

| Role | Ticket Visibility | Priority Changes | Queue Routing | Cross-Assign | Create Users | Admin Panel |
|---|---|---|---|---|---|---|
| **Client** | Own company only | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Technician** | Queues they belong to | Once (before claim) | ❌ | ✅ | ❌ | ❌ |
| **Dispatcher** *(Technician + `hasAllQueueAccess`)* | All tickets | Once (before claim) | ✅ | ✅ | ❌ | ❌ |
| **Admin** | All tickets | Unlimited | ✅ | ✅ | ✅ | ✅ |

---

*For technical architecture details, see [structure.md](./structure.md). For the product roadmap, see [roadmap.md](./roadmap.md).*
