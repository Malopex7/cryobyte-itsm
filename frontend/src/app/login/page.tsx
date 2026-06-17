"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStore, User } from "../../store";
import { Lock, Mail, AlertTriangle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password");
      }

      // Save credentials in Zustand store
      setAuth(data.data.user as User, data.token);

      // Redirect based on role
      const userRole = data.data.user.role;
      if (userRole === "Admin") {
        router.push("/admin");
      } else if (userRole === "Technician") {
        router.push("/technician/dashboard");
      } else if (userRole === "Client") {
        router.push("/portal");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      console.error("[Login Error]:", err);
      setErrorMsg(err.message || "Connection refused. Please verify backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] flex flex-col justify-center items-center p-6 font-sans">
      <div className="mb-8 flex justify-center">
        <Link href="/">
          <Image
            src="/my_assets/logo.png"
            alt="Overwatch by CryoByte"
            width={570}
            height={108}
            className="h-[64px] w-auto cursor-pointer"
            priority
          />
        </Link>
      </div>

      <div className="w-full max-w-[460px] bg-white brutalist-border p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-lg">
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-black tracking-tight">Staff & Client Login</h1>
          <p className="text-xs text-gray-500 font-mono mt-1">SECURE HANDSHAKE ENGINE v1.0</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm flex items-start gap-3 text-red-950 font-medium">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Access Denied</span>
              {errorMsg}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase tracking-wider text-[#44483d] font-mono">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-black rounded outline-none font-mono text-sm focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                placeholder="tech@cryobyte.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase tracking-wider text-[#44483d] font-mono">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-black rounded outline-none font-mono text-sm focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#B6D094] hover:bg-[#a2bf7c] text-black border-2 border-black py-3 px-6 font-black uppercase tracking-wider text-sm rounded transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? "Authenticating..." : "Establish Connection"}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 border-t border-[#1A1A1A]/10 pt-6 text-center text-xs text-gray-600 font-mono">
          First time accessing the system?{" "}
          <Link href="/register" className="font-bold underline text-black hover:text-brand-almond">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
}
