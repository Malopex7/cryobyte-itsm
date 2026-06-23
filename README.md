# 🚀 MERN + Next.js Startup Template

Welcome to your ultimate full-stack startup template. This repository is pre-configured and structured to help you bootstrap and launch new applications in record time, using a modern tech stack, best practices, and automated workflows.

## 🏗️ Architecture & Tech Stack

This project is a monorepo-style setup split into two main components:

### 💻 Frontend (`/frontend`)
- **Framework:** Next.js 15 (using the modern App Router architecture under `src/app/`)
- **React version:** React 19
- **Language:** TypeScript 5 (Strict Mode enabled)
- **Styling:** Tailwind CSS v4
- **UI & Components:** shadcn/ui (Radix UI primitives & Lucide Icons)
- **State Management:** Zustand v5
- **Tooling:** ESLint 9

### ⚙️ Backend (`/backend`)
- **Runtime:** Node.js
- **Framework:** Express 5.1.x (native support for unhandled async rejections)
- **Database ORM:** Mongoose 8.16.x (MongoDB integration)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`) & secure password hashing (`bcryptjs`)
- **Module System:** ES Modules (`"type": "module"`)

---

## 📂 Project Structure

```
├── .github/             # GitHub actions / CI configurations
├── .clinerules/         # Project-specific AI coding guidelines and rules
├── docs/                # Project documentation and resources
├── backend/             # Express 5 backend API server
│   ├── src/             # Source code (routes, controllers, models, etc.)
│   ├── package.json     # Node scripts & dependencies
│   └── .env.example     # Template for local backend configuration
└── frontend/            # Next.js 15 frontend application
    ├── src/             # Next.js App router code
    ├── public/          # Static assets
    ├── package.json     # Node scripts & dependencies
    └── .env.example     # Template for local frontend configuration
```

---

## 🚀 Getting Started

Follow these steps to get your local development environment up and running.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) (v20+ recommended) and `npm` installed.

### 1. Set Up Environment Variables

#### Backend Setup
1. Navigate to `/backend`
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your MongoDB connection URI, JWT secrets, and any third-party credentials (SMTP, Paystack, Firebase, Gemini API).

#### Frontend Setup
1. Navigate to `/frontend`
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Update `NEXT_PUBLIC_API_URL` to point to your backend server (defaults to `http://localhost:5000`).

---

### 2. Install Dependencies & Run Development Servers

#### Running Backend
Navigate to `backend/`:
```bash
cd backend
npm install
npm run dev
```
The backend server runs by default on `http://localhost:5000` with hot-reloading powered by `nodemon`.

#### Running Frontend
Navigate to `frontend/`:
```bash
cd frontend
npm install
npm run dev
```
The Next.js development server runs by default on `http://localhost:3000`.

---

## 🛡️ Continuous Integration (CI)

A GitHub Actions workflow is pre-configured in `.github/workflows/ci.yml`. On every push and pull request to `main` or `master`, the workflow:
- Lints the backend and frontend codebases.
- Verifies typescript compilation on the Next.js frontend (`tsc --noEmit`).
- Runs backend tests.
- Performs build checks on both frontend and backend.

---

## 🌐 Deployment

For detailed, step-by-step instructions on deploying the frontend to **Vercel** and the backend to **Render**, refer to the [Deployment Guide](file:///d:/cursor-dev/cryobyte-itsm/docs/deployment.md).

