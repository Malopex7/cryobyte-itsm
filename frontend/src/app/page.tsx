"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useStore } from "../store";
import {
  Ticket,
  Terminal,
  Mail,
  Upload,
  Sparkles,
  Activity,
  Clock,
  Users,
  LineChart,
  LifeBuoy,
} from "lucide-react";

// ── Odometer Hook ──
// Counts from 0 to a target value using an ease-out cubic curve
function useOdometer(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out cubic: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

// ── Log line templates ──
const LOG_TEMPLATES = [
  "[SLA_ENGINE]: Dual-clock sync established with Global NTP...",
  "[WS_GATEWAY]: WebSocket connections listening on port 8080...",
  "[DATABASE]: Replication lag 0ms...",
  "[SECURITY]: Zero-trust auth handshake successful...",
  "[MONITOR]: 432 service endpoints monitored...",
  "[STATUS]: All nodes reporting GREEN...",
  "[QUEUE_MANAGER]: P2 ticket INC-1047 assigned to technician pool...",
  "[GRIDFS]: Binary chunk stream validated, 0 corruption errors...",
  "[HEARTBEAT]: Agenda.js worker alive, last run 00:00:12 ago...",
  "[AUTH]: JWT refresh cycle completed for 14 active sessions...",
  "[CHANGESET]: Oplog tail cursor position updated successfully...",
  "[WAR_ROOM]: Socket broadcast latency 2ms, 0 dropped frames...",
];

export default function Home() {
  const { isAuthenticated, user, logout } = useStore();

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    logout();
  };

  // ── State ──
  const [logs, setLogs] = useState<string[]>([]);
  const [currentTyping, setCurrentTyping] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const logIndexRef = useRef(0);

  // ── Odometer values ──
  const activeTechs = useOdometer(14, 1400);
  const avgResponse = useOdometer(8.4, 1600);
  const slaCompliance = useOdometer(99.4, 1800);
  const p1Incidents = useOdometer(0, 800);

  // ── Auto-scroll log container ──
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, currentTyping]);

  // ── Typewriter effect for terminal ──
  const typeNextLog = useCallback(() => {
    const template = LOG_TEMPLATES[logIndexRef.current % LOG_TEMPLATES.length];
    const timestamp = new Date().toLocaleTimeString();
    const fullLine = `${template.slice(0, template.indexOf("]:") + 2)} ${timestamp} ${template.slice(template.indexOf("]:") + 3)}`;

    setIsTyping(true);
    let charIndex = 0;

    const typeInterval = setInterval(() => {
      charIndex++;
      setCurrentTyping(fullLine.slice(0, charIndex));

      if (charIndex >= fullLine.length) {
        clearInterval(typeInterval);
        setIsTyping(false);
        setCurrentTyping("");
        setLogs((prev) => {
          const updated = [...prev, fullLine];
          return updated.length > 40 ? updated.slice(-40) : updated;
        });
        logIndexRef.current++;
      }
    }, 12); // 12ms per character for fast typewriter speed

    return () => clearInterval(typeInterval);
  }, []);

  // ── Boot sequence: type initial logs quickly, then interval ──
  useEffect(() => {
    // Seed initial lines immediately
    const initialLines = LOG_TEMPLATES.slice(0, 7).map((line, i) => {
      const t = new Date(Date.now() - (7 - i) * 3000).toLocaleTimeString();
      return `${line.slice(0, line.indexOf("]:") + 2)} ${t} ${line.slice(line.indexOf("]:") + 3)}`;
    });
    setLogs(initialLines);

    // Start typewriter cycle
    const interval = setInterval(() => {
      typeNextLog();
    }, 2800);

    // First typed line after a short delay
    const initialTimeout = setTimeout(() => typeNextLog(), 800);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [typeNextLog]);

  return (
    <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] flex flex-col font-sans">
      {/* ════ TopNavBar ════ */}
      <nav className="bg-[#fbfaf2] flex justify-between items-center px-6 md:px-12 py-4 w-full sticky top-0 z-50 border-b border-[#1A1A1A]">
        <div className="flex items-center">
          <Image
            src="/my_assets/logo.png"
            alt="Overwatch by CryoByte"
            width={570}
            height={108}
            className="h-[90px] w-auto"
            priority
          />
        </div>

        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/portal"
            className="text-sm font-medium text-[#44483d] hover:bg-[#b6d094]/30 transition-colors px-3 py-2 rounded"
          >
            Client Portal
          </Link>
          {isAuthenticated && user?.role === "Admin" && (
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
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right font-mono text-xs">
                <span className="font-bold">{user.name}</span>
                <span className="text-gray-500">{user.role}</span>
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
      <main className="flex-grow max-w-[1440px] w-full mx-auto px-6 md:px-12 py-8 space-y-12">
        {/* ── Hero Section (Effect 5: Staggered Reveals) ── */}
        <section className="flex flex-col items-center text-center py-12 md:py-16 space-y-6">
          {/* Systems Operational badge (Effect 4: animate-ping on dot) */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e9e8e1] brutalist-border text-xs font-mono font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-olive opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-olive"></span>
            </span>
            SYSTEMS OPERATIONAL: 99.98% UPTIME
          </div>

          {/* Headline - instant snap (delay 0ms) */}
          <h1
            className="reveal-animate text-4xl md:text-7xl font-black tracking-tighter text-[#1b1c18] max-w-5xl leading-tight md:leading-[1.1]"
            style={{ animationDelay: "0ms" }}
          >
            Enterprise Real-Time <br />
            IT Service Management
          </h1>

          {/* Subheadline - 100ms delay */}
          <p
            className="reveal-animate text-base md:text-xl text-[#44483d] max-w-3xl leading-relaxed"
            style={{ animationDelay: "100ms" }}
          >
            Ingest, track, and resolve system issues instantly. Powered by a
            dual-clock SLA engine and real-time technician war rooms.
          </p>

          {/* CTA Buttons - 200ms delay (Effect 2: solid-offset hover) */}
          <div
            className="reveal-animate flex flex-wrap justify-center gap-4 pt-4"
            style={{ animationDelay: "200ms" }}
          >
            <Link
              href="/portal"
              className="bg-brand-olive text-black brutalist-border px-8 py-4 font-bold text-base rounded neo-brutalist-hover flex items-center gap-2 text-center"
            >
              Submit Support Ticket
              <Ticket className="h-5 w-5" />
            </Link>
            <Link
              href="/technician/dashboard"
              className="bg-transparent border-2 border-brand-bronze text-[#CA9F7D] px-8 py-4 font-bold text-base rounded neo-brutalist-hover hover:bg-brand-bronze hover:text-black flex items-center gap-2 text-center"
            >
              Open Technician Console
              <Terminal className="h-5 w-5" />
            </Link>
          </div>
        </section>

        {/* ── Operational Status Bar (Effect 3: Odometers, Effect 4: ping dot) ── */}
        <section className="bg-white brutalist-border p-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
          <div className="flex flex-col border-r border-[#1A1A1A]/10 px-4">
            <span className="text-xs font-semibold font-mono text-[#44483d] uppercase tracking-wider">
              Active Techs
            </span>
            <span className="text-2xl font-bold font-mono text-[#1b1c18] transition-colors hover:text-brand-olive cursor-default">
              {Math.round(activeTechs)}
            </span>
          </div>
          <div className="flex flex-col border-r border-[#1A1A1A]/10 px-4">
            <span className="text-xs font-semibold font-mono text-[#44483d] uppercase tracking-wider">
              Avg Response
            </span>
            <div className="flex items-center gap-2">
              {/* Effect 4: animate-ping on status dot */}
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-olive opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-olive"></span>
              </span>
              <span className="text-2xl font-bold font-mono text-[#1b1c18] transition-colors hover:text-brand-olive cursor-default">
                {avgResponse.toFixed(1)}m
              </span>
            </div>
          </div>
          <div className="flex flex-col border-r border-[#1A1A1A]/10 px-4">
            <span className="text-xs font-semibold font-mono text-[#44483d] uppercase tracking-wider">
              Active P1 Incidents
            </span>
            <span className="text-2xl font-bold font-mono text-[#1b1c18] transition-colors hover:text-brand-olive cursor-default">
              {Math.round(p1Incidents)}
            </span>
          </div>
          <div className="flex flex-col px-4">
            <span className="text-xs font-semibold font-mono text-[#44483d] uppercase tracking-wider">
              SLA Compliance
            </span>
            <div className="w-full bg-[#efeee7] h-4 brutalist-border mt-1 overflow-hidden">
              <div
                className="h-full bg-brand-almond transition-all duration-1000 ease-out"
                style={{ width: `${slaCompliance}%` }}
              ></div>
            </div>
            <span className="text-xs font-mono mt-1 text-[#44483d]">
              {slaCompliance.toFixed(1)}%
            </span>
          </div>
        </section>

        {/* ── Bento Grid (Effect 2: neo-brutalist-hover on cards) ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Card: Client Portal */}
          <div className="bg-white brutalist-border p-8 rounded-lg flex flex-col justify-between space-y-6 neo-brutalist-hover group">
            <div>
              <div className="h-12 w-12 bg-[#b6d094] brutalist-border flex items-center justify-center mb-6">
                <LifeBuoy className="h-6 w-6 text-[#4f6534]" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-4">
                Customer Service Desk
              </h2>
              <ul className="space-y-3 text-sm md:text-base text-[#44483d]">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand-bronze" />
                  Direct Email Intake Integration
                </li>
                <li className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-brand-bronze" />
                  Encrypted Dropzone Attachments
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-bronze" />
                  AI-Assisted P1-P4 Priority Routing
                </li>
              </ul>
            </div>
            <Link
              href="/portal"
              className="w-full brutalist-border py-4 font-bold text-[#1b1c18] bg-white transition-all group-hover:bg-[#b6d094] group-hover:text-black text-center block"
            >
              Access Client Portal
            </Link>
          </div>

          {/* Right Card: Tech Operations */}
          <div className="bg-white brutalist-border p-8 rounded-lg flex flex-col justify-between space-y-6 neo-brutalist-hover group">
            <div>
              <div className="h-12 w-12 bg-[#ffab68] brutalist-border flex items-center justify-center mb-6">
                <LineChart className="h-6 w-6 text-[#8e4e11]" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-4">
                Technician Operations
              </h2>
              <ul className="space-y-3 text-sm md:text-base text-[#44483d]">
                <li className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-brand-almond" />
                  Active MongoDB Change Streams
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-almond" />
                  Agenda.js Cron Validation Engine
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-almond" />
                  Real-time War Room WebSockets
                </li>
              </ul>
            </div>
            <Link
              href="/technician/dashboard"
              className="w-full brutalist-border py-4 font-bold text-[#1b1c18] bg-white transition-all group-hover:bg-[#ffab68] group-hover:text-black text-center block"
            >
              Enter Dashboard
            </Link>
          </div>
        </section>

        {/* ── Live Terminal Feed (Effect 1: Typewriter + auto-scroll) ── */}
        <section className="relative h-96 brutalist-border rounded-lg overflow-hidden bg-black">
          <div
            ref={logContainerRef}
            className="absolute inset-0 p-4 font-mono text-[11px] leading-relaxed text-brand-olive overflow-y-auto select-none pointer-events-none"
          >
            {logs.map((log, idx) => (
              <div key={idx} className="opacity-50">
                {log}
              </div>
            ))}
            {/* Currently typing line with cursor */}
            {isTyping && (
              <div className="opacity-80">
                {currentTyping}
                <span className="typewriter-cursor"></span>
              </div>
            )}
          </div>
          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none">
            <div className="text-center z-10">
              <h3 className="text-white text-3xl font-black tracking-tight mb-2">
                Built for Performance
              </h3>
              <p className="text-brand-bronze text-sm font-mono uppercase tracking-wider">
                Engineered with high-availability infrastructure for 0% downtime
              </p>
            </div>
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
              href="#"
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
