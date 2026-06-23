"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useStore } from "../../store";
import { 
  ShieldCheck, 
  Database, 
  Brain, 
  Cpu, 
  Scale, 
  ArrowLeft 
} from "lucide-react";

export default function PrivacyPolicy() {
  const { isAuthenticated, user, logout } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    logout();
  };

  return (
    <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] flex flex-col font-sans">
      {/* ════ TopNavBar ════ */}
      <nav className="bg-[#fbfaf2] flex justify-between items-center px-6 md:px-12 py-4 w-full sticky top-0 z-50 border-b border-[#1A1A1A]">
        <div className="flex items-center">
          <Link href="/">
            <Image
              src="/my_assets/logo.png"
              alt="Overwatch by CryoByte"
              width={570}
              height={108}
              className="h-[90px] w-auto cursor-pointer"
              priority
              unoptimized={true}
            />
          </Link>
        </div>

        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/portal"
            className="text-sm font-medium text-[#44483d] hover:bg-[#b6d094]/30 transition-colors px-3 py-2 rounded"
          >
            Client Portal
          </Link>
          {mounted && isAuthenticated && user?.role === "Admin" && (
            <Link
              href="/admin"
              className="text-sm font-medium text-[#44483d] hover:bg-[#b6d094]/30 transition-colors px-3 py-2 rounded font-bold"
            >
              Admin Dashboard
            </Link>
          )}
          <Link
            href="/technician/dashboard"
            className="text-sm font-medium text-[#44483d] hover:bg-[#b6d094]/30 transition-colors px-3 py-2 rounded"
          >
            Technician Hub
          </Link>
          <Link
            href="/test"
            className="text-sm font-medium text-[#44483d] hover:bg-[#b6d094]/30 transition-colors px-3 py-2 rounded"
          >
            System Status
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {mounted && isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right font-mono text-xs">
                <span className="font-bold">{user.name}</span>
                <span className="text-gray-500">
                  {user.role}
                  {user.role !== "Admin" &&
                  !user.hasAllQueueAccess &&
                  user.clientId &&
                  typeof user.clientId === "object"
                    ? ` - ${user.clientId.name}`
                    : ""}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm bg-brand-bronze text-black brutalist-border px-4 py-2 font-bold brutalist-hover inline-block text-center cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-brand-olive text-black brutalist-border px-5 py-2 font-bold brutalist-hover inline-block text-center"
            >
              Staff Login
            </Link>
          )}
        </div>
      </nav>

      {/* ════ Main Content ════ */}
      <main className="flex-grow max-w-[1200px] w-full mx-auto px-6 md:px-12 py-12 space-y-12">
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#44483d] hover:text-[#1b1c18] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        {/* Title & Header */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e9e8e1] brutalist-border text-xs font-mono font-semibold">
            EFFECTIVE DATE: 23 JUNE 2026
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
            Privacy & Data Security Policy
          </h1>
          <p className="text-lg text-[#44483d] max-w-3xl leading-relaxed">
            At CryoByte PTY LTD, we build real-time ITSM solutions designed for high availability and strict data governance. This document details how our Overwatch platform collects, secures, processes, and retains organizational data.
          </p>
        </section>

        {/* Bento Grid Policy Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Data Collection & Scope */}
          <div className="bg-white brutalist-border p-8 rounded-lg space-y-4 neo-brutalist-hover">
            <div className="h-12 w-12 bg-brand-olive brutalist-border flex items-center justify-center">
              <Database className="h-6 w-6 text-black" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">1. Data Ingestion & Scope</h2>
            <p className="text-sm text-[#44483d] leading-relaxed">
              We ingest and store data necessary for managing client support cycles, IT infrastructure state, and service level agreements (SLAs).
            </p>
            <ul className="text-xs font-mono space-y-2 text-[#44483d] list-disc list-inside">
              <li><strong>User Roles:</strong> Contact details, credentials, and organizational affiliations.</li>
              <li><strong>Tickets & Audits:</strong> Subject lines, description logs, priority matrices, and timeline timestamps.</li>
              <li><strong>Attachments:</strong> System screenshots, logs, and diagnostic files stored securely in MongoDB GridFS buckets.</li>
              <li><strong>Telemetry & Presence:</strong> Active WebSocket connection tracking for technician cursor presence.</li>
            </ul>
          </div>

          {/* Card 2: AI Processing & Telemetry */}
          <div className="bg-white brutalist-border p-8 rounded-lg space-y-4 neo-brutalist-hover">
            <div className="h-12 w-12 bg-brand-bronze brutalist-border flex items-center justify-center">
              <Brain className="h-6 w-6 text-black" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">2. AI Assistance & Processing</h2>
            <p className="text-sm text-[#44483d] leading-relaxed">
              Our support queues leverage artificial intelligence to optimize routing latency, response intervals, and resolution accuracy.
            </p>
            <ul className="text-xs font-mono space-y-2 text-[#44483d] list-disc list-inside">
              <li><strong>Gemini AI Integration:</strong> Ticket descriptions are evaluated via Google's Gemini API for priority, classification, and assignment queue proposals.</li>
              <li><strong>SLA Engine:</strong> Ticket lifecycles are monitored in real-time by our Agenda scheduler to ensure SLA compliance.</li>
              <li>No ticketing data processed by our AI algorithms is used by third-party LLMs for model training purposes.</li>
            </ul>
          </div>

          {/* Card 3: Security & Real-Time Sync */}
          <div className="bg-white brutalist-border p-8 rounded-lg space-y-4 neo-brutalist-hover">
            <div className="h-12 w-12 bg-brand-almond brutalist-border flex items-center justify-center">
              <Cpu className="h-6 w-6 text-black" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">3. Security & Real-Time Transport</h2>
            <p className="text-sm text-[#44483d] leading-relaxed">
              Overwatch utilizes zero-trust architecture to protect client tickets and support portals.
            </p>
            <ul className="text-xs font-mono space-y-2 text-[#44483d] list-disc list-inside">
              <li><strong>Transport Encryption:</strong> All client API transactions are encrypted via TLS 1.3 in transit and stored using AES-256 at rest.</li>
              <li><strong>JSON Web Tokens (JWT):</strong> Secure, stateless validation is enforced across all technician and client endpoints.</li>
              <li><strong>Socket.io Streams:</strong> Event-driven WebSocket streams sync updates immediately across client presence systems without persistent long-polling.</li>
            </ul>
          </div>

          {/* Card 4: Compliance & Regional Governance */}
          <div className="bg-white brutalist-border p-8 rounded-lg space-y-4 neo-brutalist-hover">
            <div className="h-12 w-12 bg-gray-200 brutalist-border flex items-center justify-center">
              <Scale className="h-6 w-6 text-black" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">4. Regional Compliance & POPIA</h2>
            <p className="text-sm text-[#44483d] leading-relaxed">
              CryoByte is headquartered in South Africa and ensures full compliance with local and international privacy regulations.
            </p>
            <ul className="text-xs font-mono space-y-2 text-[#44483d] list-disc list-inside">
              <li><strong>POPIA & GDPR:</strong> We strictly adhere to the Protection of Personal Information Act (POPI Act) of South Africa and the General Data Protection Regulation (GDPR).</li>
              <li><strong>Access Rights:</strong> Users have the right to request access, correction, or deletion of their ticket history and personal profiles.</li>
              <li><strong>Third-Party Integrations:</strong> Firebase (Auth validation) and Paystack (payment billing) comply with global and regional security standards (PCI-DSS).</li>
            </ul>
          </div>
        </section>

        {/* Contact/Support Footer */}
        <section className="bg-white brutalist-border p-8 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-brand-olive" />
              Information Security Office
            </h3>
            <p className="text-sm text-[#44483d] max-w-xl">
              For privacy queries, subject access requests, or to obtain our full Promotion of Access to Information Act (PAIA) manual, please get in touch with our security compliance team.
            </p>
          </div>
          <div>
            <a
              href="mailto:security@cryobyte.com"
              className="bg-brand-olive text-black brutalist-border px-6 py-3 font-bold brutalist-hover inline-block text-center cursor-pointer text-sm"
            >
              Contact Compliance
            </a>
          </div>
        </section>
      </main>

      {/* ════ Footer ════ */}
      <footer className="bg-[#e3e3dc] border-t-2 border-[#1A1A1A] w-full mt-24">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 py-6 w-full max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <Image
              src="/my_assets/logo.png"
              alt="CryoByte"
              width={390}
              height={63}
              className="h-[54px] w-auto opacity-70"
              unoptimized={true}
            />
            <span className="text-xs font-mono uppercase tracking-widest text-[#44483d]">
              © 2026 CryoByte PTY LTD | v1.0.0-Beta
            </span>
          </div>
          <div className="flex gap-6 text-xs font-mono">
            <Link
              href="#"
              className="text-[#44483d] hover:text-brand-olive transition-colors"
            >
              System Documentation
            </Link>
            <Link
              href="#"
              className="text-[#44483d] hover:text-brand-olive transition-colors"
            >
              SLA Agreement
            </Link>
            <Link
              href="/privacy"
              className="text-[#44483d] hover:text-brand-olive transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
