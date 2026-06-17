"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Shield, UserPlus, AlertTriangle } from "lucide-react";

interface ClientCompany {
  _id: string;
  name: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Client" | "Technician" | "Admin">("Client");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<ClientCompany[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch active clients for company dropdown selection
  useEffect(() => {
    if (role === "Client") {
      setClientsLoading(true);
      fetch("/api/v1/auth/clients")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load clients list");
          return res.json();
        })
        .then((data) => {
          setClients(data.data.clients || []);
          if (data.data.clients && data.data.clients.length > 0) {
            setClientId(data.data.clients[0]._id);
          }
        })
        .catch((err) => {
          console.error(err);
          setErrorMsg("Could not fetch the registered companies list from server.");
        })
        .finally(() => {
          setClientsLoading(false);
        });
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    if (role === "Client" && !clientId) {
      setErrorMsg("Please select your associated client company.");
      setIsLoading(false);
      return;
    }

    try {
      const payload: any = { name, email, password, role };
      if (role === "Client") {
        payload.clientId = clientId;
      }

      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed. Please try again.");
      }

      setSuccessMsg("Account created successfully! Redirecting to login page...");
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err: any) {
      console.error("[Registration Error]:", err);
      setErrorMsg(err.message || "An error occurred. Please verify backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] flex flex-col justify-center items-center p-6 font-sans">
      <div className="mb-6 flex justify-center">
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

      <div className="w-full max-w-[480px] bg-white brutalist-border p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-lg">
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-black tracking-tight">Create Account</h1>
          <p className="text-xs text-gray-500 font-mono mt-1">NEW IDENTITY ENROLLMENT v1.0</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm flex items-start gap-3 text-red-950 font-medium">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Verification Error</span>
              {errorMsg}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm flex items-start gap-3 text-green-950 font-medium animate-pulse">
            <UserPlus className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Account Provisioned</span>
              {successMsg}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded outline-none font-mono text-sm focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded outline-none font-mono text-sm focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                placeholder="john.doe@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded outline-none font-mono text-sm focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Role selection */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">
              System Role
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded outline-none font-mono text-sm focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all appearance-none cursor-pointer"
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                disabled={isLoading}
              >
                <option value="Client">Client (Intake Portal)</option>
                <option value="Technician">Technician (War Room)</option>
                <option value="Admin">System Administrator</option>
              </select>
            </div>
          </div>

          {/* Client Company dropdown (conditional) */}
          {role === "Client" && (
            <div className="space-y-1 bg-[#fcfcfa] p-3 border border-dashed border-gray-400 rounded">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">
                Associated Company
              </label>
              {clientsLoading ? (
                <span className="text-xs font-mono text-gray-500 block py-1 animate-pulse">Loading active client databases...</span>
              ) : clients.length === 0 ? (
                <span className="text-xs font-mono text-red-600 block py-1">No active companies found. Please contact support.</span>
              ) : (
                <select
                  required
                  className="w-full mt-1 p-2 bg-white border-2 border-black rounded outline-none font-mono text-sm focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all appearance-none cursor-pointer"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={isLoading}
                >
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || (role === "Client" && clients.length === 0)}
            className="w-full bg-[#CA9F7D] hover:bg-[#b88c6a] text-black border-2 border-black py-3 px-6 font-black uppercase tracking-wider text-sm rounded mt-4 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? "Enrolling Identity..." : "Create Account Profile"}
          </button>
        </form>

        <div className="mt-6 border-t border-[#1A1A1A]/10 pt-4 text-center text-xs text-gray-600 font-mono">
          Already have an account?{" "}
          <Link href="/login" className="font-bold underline text-black hover:text-[#B6D094]">
            Log In here
          </Link>
        </div>
      </div>
    </div>
  );
}
