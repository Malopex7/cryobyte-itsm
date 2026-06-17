"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore, Queue } from "../../store";
import { AlertCircle, CheckCircle, Plus, Shield, Users, Building, Activity, Sliders } from "lucide-react";

interface ClientCompany {
  _id: string;
  name: string;
  domains: string[];
  contactEmail?: string;
  contactPhone?: string;
  sla?: {
    p1: { ackTarget: number; resolveTarget: number };
    p2: { ackTarget: number; resolveTarget: number };
    p3: { ackTarget: number; resolveTarget: number };
    p4: { ackTarget: number; resolveTarget: number };
  };
}

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: "Client" | "Technician" | "Admin";
  clientId?: { _id: string; name: string };
}

interface Metrics {
  totalTickets: number;
  activeTickets: number;
  resolvedTickets: number;
  breachedTickets: number;
  complianceRate: number;
  activeTechs: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, token, logout } = useStore();

  // Metrics State
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Clients State
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  // Users State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Form State: Client Creation
  const [clientName, setClientName] = useState("");
  const [clientDomains, setClientDomains] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  
  // Custom SLA minutes
  const [p1Ack, setP1Ack] = useState(15);
  const [p1Resolve, setP1Resolve] = useState(120);
  const [p2Ack, setP2Ack] = useState(60);
  const [p2Resolve, setP2Resolve] = useState(480);
  const [p3Ack, setP3Ack] = useState(120);
  const [p3Resolve, setP3Resolve] = useState(1440);
  const [p4Ack, setP4Ack] = useState(240);
  const [p4Resolve, setP4Resolve] = useState(2880);

  // Form State: User Editing
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"Client" | "Technician" | "Admin">("Client");
  const [editClientId, setEditClientId] = useState("");
  const [editHasAllQueueAccess, setEditHasAllQueueAccess] = useState(false);

  // Queue State
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queueName, setQueueName] = useState("");
  const [queueDescription, setQueueDescription] = useState("");
  const [queueColor, setQueueColor] = useState("#6366f1");
  const [queueMembers, setQueueMembers] = useState<string[]>([]);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [editQueueName, setEditQueueName] = useState("");
  const [editQueueColor, setEditQueueColor] = useState("");
  const [editQueueMembers, setEditQueueMembers] = useState<string[]>([]);

  // Feedback State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load Admin Data
  const loadAdminData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch metrics
      const resMetrics = await fetch("/api/v1/admin/metrics", { headers });
      const dataMetrics = await resMetrics.json();
      if (resMetrics.ok) setMetrics(dataMetrics.data.metrics);
      setMetricsLoading(false);

      // 2. Fetch clients
      const resClients = await fetch("/api/v1/admin/clients", { headers });
      const dataClients = await resClients.json();
      if (resClients.ok) setClients(dataClients.data.clients);
      setClientsLoading(false);

      // 3. Fetch users
      const resUsers = await fetch("/api/v1/admin/users", { headers });
      const dataUsers = await resUsers.json();
      if (resUsers.ok) setUsers(dataUsers.data.users);
      setUsersLoading(false);

      // 4. Fetch queues
      const resQueues = await fetch("/api/v1/queues", { headers });
      const dataQueues = await resQueues.json();
      if (resQueues.ok) setQueues(dataQueues.data.queues || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load administration database records.");
    }
  };

  useEffect(() => {
    if (token) {
      loadAdminData();
    }
  }, [token]);

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    logout();
    router.push("/login");
  };

  // Onboard new client company
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setActionLoading(true);

    const domainsArr = clientDomains.split(",").map(d => d.trim().toLowerCase()).filter(Boolean);

    try {
      const response = await fetch("/api/v1/admin/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: clientName,
          domains: domainsArr,
          contactEmail: clientEmail,
          contactPhone: clientPhone,
          address: clientAddress,
          sla: {
            p1: { ackTarget: p1Ack, resolveTarget: p1Resolve },
            p2: { ackTarget: p2Ack, resolveTarget: p2Resolve },
            p3: { ackTarget: p3Ack, resolveTarget: p3Resolve },
            p4: { ackTarget: p4Ack, resolveTarget: p4Resolve }
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create client.");

      setSuccessMsg(`Onboarded company "${clientName}" successfully!`);
      setClientName("");
      setClientDomains("");
      setClientEmail("");
      setClientPhone("");
      setClientAddress("");
      loadAdminData(); // Refresh lists
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Could not register company.");
    } finally {
      setActionLoading(false);
    }
  };

  // Save role / company change for a user
  const handleSaveUserChange = async (userId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setActionLoading(true);

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          role: editRole,
          clientId: editRole === "Client" ? editClientId : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update user.");

      setSuccessMsg(`Successfully updated user role configuration!`);
      setEditingUserId(null);
      loadAdminData(); // Refresh lists
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Could not update user roles.");
    } finally {
      setActionLoading(false);
    }
  };

  // Grant/revoke dispatcher access without opening full edit mode
  const handleToggleDispatcher = async (userId: string, current: boolean) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hasAllQueueAccess: !current })
      });
      if (response.ok) {
        setSuccessMsg(`Dispatcher access ${!current ? 'granted' : 'revoked'} successfully.`);
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create a new queue
  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setActionLoading(true);
    try {
      const response = await fetch("/api/v1/admin/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: queueName, description: queueDescription, color: queueColor, members: queueMembers })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create queue.");
      setSuccessMsg(`Queue "${queueName}" created!`);
      setQueueName(""); setQueueDescription(""); setQueueColor("#6366f1"); setQueueMembers([]);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Save queue edits
  const handleSaveQueueEdit = async (queueId: string) => {
    setActionLoading(true);
    try {
      await Promise.all([
        fetch(`/api/v1/admin/queues/${queueId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: editQueueName, color: editQueueColor })
        }),
        fetch(`/api/v1/admin/queues/${queueId}/members`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ members: editQueueMembers })
        })
      ]);
      setSuccessMsg('Queue updated!');
      setEditingQueueId(null);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete queue
  const handleDeleteQueue = async (queueId: string, queueName: string) => {
    if (!window.confirm(`Delete queue "${queueName}"? Tickets in this queue will become Unqueued.`)) return;
    try {
      await fetch(`/api/v1/admin/queues/${queueId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg(`Queue "${queueName}" deleted.`);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const startEditingUser = (u: any) => {
    setEditingUserId(u._id);
    setEditRole(u.role);
    setEditClientId(u.clientId?._id || (clients[0]?._id || ""));
    setEditHasAllQueueAccess(u.hasAllQueueAccess || false);
  };

  return (
    <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] p-6 font-sans">
      <div className="max-w-[1440px] mx-auto">
        {/* Top Header Panel */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white brutalist-border p-4 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] gap-4 rounded-lg">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs font-mono font-bold uppercase border-2 border-black px-3 py-1.5 bg-[#efeee7] hover:bg-gray-200">
              ← Main Site
            </Link>
            <div className="font-mono text-xs">
              <span className="text-gray-500 font-bold">PORTAL: </span>
              <span className="font-bold text-red-700">SYSTEM ADMINISTRATION</span>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            {user && (
              <div className="font-mono text-xs">
                <span className="font-bold">{user.name}</span>{" "}
                <span className="text-gray-500">({user.role})</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-xs bg-brand-bronze text-black brutalist-border px-4 py-1.5 font-bold brutalist-hover cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm flex items-start gap-2 text-red-950 font-bold">
            <AlertCircle className="w-5 h-5 text-red-700 shrink-0" />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm flex items-start gap-2 text-green-950 font-bold animate-pulse">
            <CheckCircle className="w-5 h-5 text-green-700 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* ── System Metrics Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white brutalist-border p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between rounded-lg">
            <span className="text-xs font-bold font-mono text-gray-500 uppercase tracking-wider">Total Tickets Logged</span>
            {metricsLoading ? (
              <span className="text-xl font-bold font-mono animate-pulse">...</span>
            ) : (
              <span className="text-3xl font-black font-mono mt-2">{metrics?.totalTickets}</span>
            )}
          </div>
          <div className="bg-white brutalist-border p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between rounded-lg">
            <span className="text-xs font-bold font-mono text-gray-500 uppercase tracking-wider">Active Incidents</span>
            {metricsLoading ? (
              <span className="text-xl font-bold font-mono animate-pulse">...</span>
            ) : (
              <span className="text-3xl font-black font-mono mt-2 text-brand-almond">{metrics?.activeTickets}</span>
            )}
          </div>
          <div className="bg-white brutalist-border p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between rounded-lg">
            <span className="text-xs font-bold font-mono text-gray-500 uppercase tracking-wider">SLA Compliance Rate</span>
            {metricsLoading ? (
              <span className="text-xl font-bold font-mono animate-pulse">...</span>
            ) : (
              <span className="text-3xl font-black font-mono mt-2 text-green-700">{metrics?.complianceRate}%</span>
            )}
          </div>
          <div className="bg-white brutalist-border p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between rounded-lg">
            <span className="text-xs font-bold font-mono text-gray-500 uppercase tracking-wider">Active Technicians</span>
            {metricsLoading ? (
              <span className="text-xl font-bold font-mono animate-pulse">...</span>
            ) : (
              <span className="text-3xl font-black font-mono mt-2 text-blue-700">{metrics?.activeTechs}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Block: Client Onboarding and List */}
          <div className="lg:col-span-6 space-y-8">
            {/* Form */}
            <div className="bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
              <h2 className="text-2xl font-black mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                <Building className="w-6 h-6 text-brand-almond" /> Onboard Client Company
              </h2>

              <form onSubmit={handleCreateClient} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Company Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Acme Corp PTY"
                      className="w-full p-2.5 bg-white border-2 border-black rounded outline-none text-sm focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Email Domains (comma-separated)</label>
                    <input
                      type="text"
                      required
                      placeholder="acme.com, acme.co.za"
                      className="w-full p-2.5 bg-white border-2 border-black rounded outline-none text-sm focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-mono"
                      value={clientDomains}
                      onChange={(e) => setClientDomains(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Contact Email</label>
                    <input
                      type="email"
                      placeholder="support@acme.com"
                      className="w-full p-2.5 bg-white border-2 border-black rounded outline-none text-sm focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+27 11 987 6543"
                      className="w-full p-2.5 bg-white border-2 border-black rounded outline-none text-sm focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Physical Address</label>
                  <input
                    type="text"
                    placeholder="12 Sandton Boulevard, Johannesburg"
                    className="w-full p-2.5 bg-white border-2 border-black rounded outline-none text-sm focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                  />
                </div>

                {/* SLA Overrides Accordion */}
                <div className="border-2 border-black p-4 rounded bg-[#fcfcfa]">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-1 font-mono uppercase">
                    <Sliders className="w-4 h-4 text-brand-bronze" /> Custom Client SLA Targets (Minutes)
                  </h3>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div></div>
                    <span className="font-bold uppercase">ACK</span>
                    <span className="font-bold uppercase">RESOLVE</span>
                    <div></div>

                    <span className="font-bold text-red-600 self-center">P1 (24/7)</span>
                    <input type="number" className="p-1 border border-black text-center" value={p1Ack} onChange={e => setP1Ack(parseInt(e.target.value))} />
                    <input type="number" className="p-1 border border-black text-center" value={p1Resolve} onChange={e => setP1Resolve(parseInt(e.target.value))} />
                    <span></span>

                    <span className="font-bold text-orange-500 self-center">P2 (Biz)</span>
                    <input type="number" className="p-1 border border-black text-center" value={p2Ack} onChange={e => setP2Ack(parseInt(e.target.value))} />
                    <input type="number" className="p-1 border border-black text-center" value={p2Resolve} onChange={e => setP2Resolve(parseInt(e.target.value))} />
                    <span></span>

                    <span className="font-bold text-yellow-600 self-center">P3 (Biz)</span>
                    <input type="number" className="p-1 border border-black text-center" value={p3Ack} onChange={e => setP3Ack(parseInt(e.target.value))} />
                    <input type="number" className="p-1 border border-black text-center" value={p3Resolve} onChange={e => setP3Resolve(parseInt(e.target.value))} />
                    <span></span>

                    <span className="font-bold text-green-600 self-center">P4 (Biz)</span>
                    <input type="number" className="p-1 border border-black text-center" value={p4Ack} onChange={e => setP4Ack(parseInt(e.target.value))} />
                    <input type="number" className="p-1 border border-black text-center" value={p4Resolve} onChange={e => setP4Resolve(parseInt(e.target.value))} />
                    <span></span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-brand-olive hover:bg-[#a2bf7c] text-black border-2 border-black py-3 px-6 font-bold uppercase tracking-wider text-sm rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Register New Company Profile
                </button>
              </form>
            </div>

            {/* List */}
            <div className="bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
              <h2 className="text-2xl font-black mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                <Building className="w-6 h-6" /> Client Directories ({clients.length})
              </h2>

              <div className="max-h-[350px] overflow-y-auto pr-1">
                {clientsLoading ? (
                  <span className="text-xs font-mono text-gray-500 block animate-pulse py-4 text-center">Loading client companies...</span>
                ) : clients.length === 0 ? (
                  <span className="text-xs font-mono text-gray-400 block py-4 text-center">No companies configured.</span>
                ) : (
                  <div className="space-y-3">
                    {clients.map((c) => (
                      <div key={c._id} className="p-3 border-2 border-black bg-gray-50 flex justify-between items-center text-xs font-mono">
                        <div>
                          <span className="font-bold text-sm block font-sans text-black">{c.name}</span>
                          <span className="text-gray-500">DOMAINS: {c.domains.join(", ")}</span>
                        </div>
                        <div className="text-right text-[10px] text-gray-600 bg-white border border-gray-300 p-1.5 rounded">
                          <span className="block font-bold">SLA TARGETS (ACK / RES)</span>
                          <span className="block">P1: {c.sla?.p1?.ackTarget}m / {c.sla?.p1?.resolveTarget}m</span>
                          <span className="block">P2: {c.sla?.p2?.ackTarget}m / {c.sla?.p2?.resolveTarget}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Block: User Management */}
          <div className="lg:col-span-6 space-y-8">
            <div className="bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
              <h2 className="text-2xl font-black mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                <Users className="w-6 h-6 text-brand-olive" /> User Identity Directory ({users.length})
              </h2>

              <div className="max-h-[780px] overflow-y-auto pr-1">
                {usersLoading ? (
                  <span className="text-xs font-mono text-gray-500 block animate-pulse py-4 text-center">Loading registered identities...</span>
                ) : (
                  <div className="space-y-4">
                    {users.map((u) => {
                      const isEditing = editingUserId === u._id;
                      return (
                        <div key={u._id} className="p-4 border-2 border-black bg-white flex flex-col gap-2 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold font-sans text-sm block">{u.name}</span>
                              <span className="text-xs text-gray-500 font-mono block">{u.email}</span>
                            </div>
                            <span className={`text-[10px] font-mono font-bold border border-black uppercase px-2 py-0.5 ${
                              u.role === 'Admin' ? 'bg-red-500 text-white' :
                              u.role === 'Technician' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                            }`}>
                              {u.role}
                            </span>
                          </div>

                          <div className="text-xs font-mono text-gray-700 bg-gray-50 p-2 border border-gray-200">
                            {u.role === "Client" ? (
                              <span>COMPANY: <span className="font-bold text-black">{u.clientId?.name || "Unassigned"}</span></span>
                            ) : (
                              <span>SYSTEM LEVEL PRIVILEGES</span>
                            )}
                          </div>

                          {/* Editing controls */}
                          {isEditing ? (
                            <div className="mt-2 p-3 bg-[#fcfcfa] border border-dashed border-gray-400 rounded space-y-3 font-mono text-xs">
                              <div className="flex items-center justify-between gap-4">
                                <span>ROLE:</span>
                                <select 
                                  className="p-1.5 border border-black bg-white"
                                  value={editRole}
                                  onChange={e => setEditRole(e.target.value as any)}
                                >
                                  <option value="Client">Client</option>
                                  <option value="Technician">Technician</option>
                                  <option value="Admin">Admin</option>
                                </select>
                              </div>

                              {editRole === "Client" && (
                                <div className="flex items-center justify-between gap-4">
                                  <span>COMPANY:</span>
                                  <select 
                                    className="p-1.5 border border-black bg-white w-2/3"
                                    value={editClientId}
                                    onChange={e => setEditClientId(e.target.value)}
                                  >
                                    {clients.map(c => (
                                      <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Dispatcher toggle — only for Techs/Admins */}
                              {editRole !== "Client" && (
                                <div className="flex items-center justify-between gap-4">
                                  <span>DISPATCHER ACCESS:</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditHasAllQueueAccess(!editHasAllQueueAccess)}
                                    className={`px-3 py-1 border-2 border-black font-bold text-[11px] uppercase cursor-pointer transition-all ${
                                      editHasAllQueueAccess ? 'bg-purple-600 text-white' : 'bg-gray-100 text-black'
                                    }`}
                                  >
                                    {editHasAllQueueAccess ? '✓ ENABLED' : 'DISABLED'}
                                  </button>
                                </div>
                              )}

                              <div className="flex justify-end gap-2 pt-2">
                                <button 
                                  onClick={() => setEditingUserId(null)}
                                  className="px-3 py-1 border border-black text-black bg-white text-[11px] font-bold uppercase cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => {
                                    // Pass hasAllQueueAccess along with the save
                                    fetch(`/api/v1/admin/users/${u._id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ role: editRole, clientId: editRole === 'Client' ? editClientId : undefined, hasAllQueueAccess: editHasAllQueueAccess })
                                    }).then(() => { setSuccessMsg('User updated!'); setEditingUserId(null); loadAdminData(); });
                                  }}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-brand-olive text-black border border-black text-[11px] font-bold uppercase cursor-pointer"
                                >
                                  Save Configurations
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <button 
                                onClick={() => startEditingUser(u)}
                                className="text-[10px] font-mono font-bold uppercase border-2 border-black px-3 py-1 bg-[#efeee7] hover:bg-gray-200 cursor-pointer"
                              >
                                Modify Settings
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Queue Management Panel ── */}
        <div className="mt-8 bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
          <h2 className="text-2xl font-black mb-6 border-b-2 border-black pb-2 flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" /> Queue Management ({queues.length} queues)
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Queue Form */}
            <div>
              <h3 className="text-sm font-black uppercase mb-4 font-mono">Create New Queue</h3>
              <form onSubmit={handleCreateQueue} className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Queue Name</label>
                    <input type="text" required placeholder="e.g. Networking" className="w-full p-2 border-2 border-black bg-white text-sm outline-none" value={queueName} onChange={e => setQueueName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Color</label>
                    <input type="color" className="h-[42px] w-12 p-0.5 border-2 border-black cursor-pointer" value={queueColor} onChange={e => setQueueColor(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Description</label>
                  <input type="text" placeholder="Optional description" className="w-full p-2 border-2 border-black bg-white text-sm outline-none" value={queueDescription} onChange={e => setQueueDescription(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Members (Technicians)</label>
                  <div className="max-h-40 overflow-y-auto border-2 border-black p-2 space-y-1 bg-gray-50">
                    {users.filter(u => u.role === 'Technician' || u.role === 'Admin').map(u => (
                      <label key={u._id} className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                        <input type="checkbox" checked={queueMembers.includes(u._id)} onChange={e => {
                          if (e.target.checked) setQueueMembers(m => [...m, u._id]);
                          else setQueueMembers(m => m.filter(id => id !== u._id));
                        }} />
                        {u.name} <span className="text-gray-400">({u.role})</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={actionLoading} className="w-full py-2 bg-black text-white font-bold text-sm border-2 border-black hover:bg-gray-900 transition-all cursor-pointer flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Create Queue
                </button>
              </form>
            </div>

            {/* Existing Queues List */}
            <div>
              <h3 className="text-sm font-black uppercase mb-4 font-mono">Existing Queues</h3>
              {queues.length === 0 ? (
                <p className="text-xs font-mono text-gray-500">No queues created yet.</p>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {queues.map(q => {
                    const isEditing = editingQueueId === q._id;
                    return (
                      <div key={q._id} className="border-2 border-black p-4 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border border-black flex-shrink-0" style={{ backgroundColor: q.color }} />
                            <span className="font-bold font-sans">{q.name}</span>
                            <span className="text-[10px] font-mono text-gray-500">({q.members.length} members)</span>
                            {!q.isActive && <span className="text-[10px] font-mono bg-red-100 text-red-700 border border-red-400 px-1">INACTIVE</span>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingQueueId(q._id); setEditQueueName(q.name); setEditQueueColor(q.color); setEditQueueMembers(q.members.map(m => m._id)); }} className="text-[10px] font-mono font-bold border-2 border-black px-2 py-1 bg-[#efeee7] hover:bg-gray-200 cursor-pointer">Edit</button>
                            <button onClick={() => handleDeleteQueue(q._id, q.name)} className="text-[10px] font-mono font-bold border-2 border-black px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer">Delete</button>
                          </div>
                        </div>

                        {!isEditing && q.members.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {q.members.map(m => (
                              <span key={m._id} className="text-[10px] font-mono bg-gray-100 border border-gray-300 px-1.5 py-0.5">{m.name}</span>
                            ))}
                          </div>
                        )}

                        {isEditing && (
                          <div className="mt-3 pt-3 border-t border-dashed border-gray-400 space-y-2 font-mono text-xs">
                            <div className="flex gap-2">
                              <input type="text" className="flex-1 p-1.5 border-2 border-black bg-white" value={editQueueName} onChange={e => setEditQueueName(e.target.value)} />
                              <input type="color" className="w-10 h-8 p-0.5 border-2 border-black cursor-pointer" value={editQueueColor} onChange={e => setEditQueueColor(e.target.value)} />
                            </div>
                            <div className="max-h-32 overflow-y-auto border-2 border-black p-2 space-y-1 bg-gray-50">
                              {users.filter(u => u.role === 'Technician' || u.role === 'Admin').map(u => (
                                <label key={u._id} className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={editQueueMembers.includes(u._id)} onChange={e => {
                                    if (e.target.checked) setEditQueueMembers(m => [...m, u._id]);
                                    else setEditQueueMembers(m => m.filter(id => id !== u._id));
                                  }} />
                                  {u.name}
                                </label>
                              ))}
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingQueueId(null)} className="px-3 py-1 border border-black bg-white font-bold uppercase text-[10px] cursor-pointer">Cancel</button>
                              <button onClick={() => handleSaveQueueEdit(q._id)} className="px-3 py-1 bg-black text-white font-bold uppercase text-[10px] cursor-pointer">Save</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
