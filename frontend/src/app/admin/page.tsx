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
  hasAllQueueAccess?: boolean;
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

  // Form State: New Single User
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"Client" | "Technician" | "Admin">("Technician");
  const [newClientId, setNewClientId] = useState("");
  const [newHasAllQueueAccess, setNewHasAllQueueAccess] = useState(false);

  // Bulk / CSV import state
  type BulkRow = { name: string; email: string; password: string; role: string; clientId?: string; hasAllQueueAccess?: boolean; _error?: string };
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkResult, setBulkResult] = useState<{ summary: { total: number; created: number; failed: number }; failed: { email: string; reason: string }[] } | null>(null);
  const [bulkTab, setBulkTab] = useState<'single' | 'bulk' | 'csv'>('single');
  const [userFilter, setUserFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
  const [createQueueMemberSearch, setCreateQueueMemberSearch] = useState("");
  const [editQueueMemberSearch, setEditQueueMemberSearch] = useState("");

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
          clientId: editClientId || undefined
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
      setCreateQueueMemberSearch("");
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
      setEditQueueMemberSearch("");
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

  // Create a single user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setActionLoading(true);
    try {
      const response = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newName, email: newEmail, password: newPassword,
          role: newRole, clientId: newClientId || undefined,
          hasAllQueueAccess: newHasAllQueueAccess
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create user.");
      setSuccessMsg(`User "${newName}" created successfully.`);
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("Technician"); setNewClientId(""); setNewHasAllQueueAccess(false);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit bulk rows (already parsed)
  const handleBulkSubmit = async () => {
    if (bulkRows.length === 0) return;
    setErrorMsg(null);
    setBulkResult(null);
    setActionLoading(true);
    try {
      const response = await fetch("/api/v1/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ users: bulkRows.map(r => ({
          name: r.name, email: r.email, password: r.password,
          role: r.role, clientId: r.clientId || undefined,
          hasAllQueueAccess: r.hasAllQueueAccess || false
        }))})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Bulk import failed.");
      setBulkResult(data.data);
      setSuccessMsg(`Bulk import complete: ${data.data.summary.created} created, ${data.data.summary.failed} failed.`);
      setBulkRows([]);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Parse CSV file into bulk rows
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setBulkResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setErrorMsg("CSV must have a header row and at least one data row."); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const required = ["name", "email", "password", "role"];
      const missing = required.filter(r => !headers.includes(r));
      if (missing.length) { setErrorMsg(`CSV missing required columns: ${missing.join(", ")}`); return; }
      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const row: any = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
        rows.push(row);
      }
      setBulkRows(rows);
      setBulkTab("bulk");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to delete user.");
      setSuccessMsg("User deleted successfully.");
      setDeleteConfirmId(null);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Filtered users for directory
  const filteredUsers = users.filter(u => {
    // 1. Text Search query
    if (userFilter.trim()) {
      const q = userFilter.toLowerCase().trim();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchCompany = u.role === "Client" && u.clientId?.name?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchCompany) {
        return false;
      }
    }
    // 2. Role filter
    if (roleFilter !== "ALL") {
      if (roleFilter === "Dispatcher") {
        if (!u.hasAllQueueAccess) return false;
      } else {
        if (u.role !== roleFilter) return false;
      }
    }
    // 3. Company filter
    if (companyFilter !== "ALL") {
      if (companyFilter === "SYSTEM") {
        if (u.role === "Client") return false;
      } else {
        const uCompanyId = u.clientId && typeof u.clientId === 'object' ? u.clientId._id : u.clientId;
        if (uCompanyId !== companyFilter) return false;
      }
    }
    return true;
  });

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
                <span className="text-gray-500">
                  ({user.role}{user.role !== 'Admin' && !user.hasAllQueueAccess && user.clientId && typeof user.clientId === 'object' ? ` - ${user.clientId.name}` : ''})
                </span>
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
          <div className="lg:col-span-6 space-y-6">

            {/* ── Create User Panel ── */}
            <div className="bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
              <h2 className="text-2xl font-black mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                <Plus className="w-6 h-6 text-brand-olive" /> Create Users
              </h2>

              {/* Tab Strip */}
              <div className="flex gap-0 mb-5 border-2 border-black overflow-hidden">
                {(['single', 'csv', 'bulk'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setBulkTab(tab)}
                    className={`flex-1 py-2 text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer border-r-2 border-black last:border-r-0 ${
                      bulkTab === tab ? 'bg-black text-white' : 'bg-[#efeee7] hover:bg-gray-200 text-black'
                    }`}
                  >
                    {tab === 'single' ? '+ Single User' : tab === 'csv' ? '↑ CSV Import' : '⊞ Bulk Preview'}
                  </button>
                ))}
              </div>

              {/* ── Single User Form ── */}
              {bulkTab === 'single' && (
                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Full Name</label>
                      <input required type="text" placeholder="Jane Smith" className="w-full p-2.5 border-2 border-black bg-white text-sm outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all" value={newName} onChange={e => setNewName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Email Address</label>
                      <input required type="email" placeholder="jane@company.com" className="w-full p-2.5 border-2 border-black bg-white text-sm outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-mono" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Password</label>
                      <input required type="password" minLength={6} placeholder="Min 6 characters" className="w-full p-2.5 border-2 border-black bg-white text-sm outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-mono" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">Role</label>
                      <select className="w-full p-2.5 border-2 border-black bg-white text-sm outline-none cursor-pointer" value={newRole} onChange={e => setNewRole(e.target.value as any)}>
                        <option value="Technician">Technician</option>
                        <option value="Admin">Admin</option>
                        <option value="Client">Client</option>
                      </select>
                    </div>
                  </div>

                  {/* Company — required for Client, optional for Technician/Admin */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">
                      {newRole === 'Client' ? 'Client Company' : 'Company (optional)'}
                    </label>
                    <select
                      required={newRole === 'Client'}
                      className="w-full p-2.5 border-2 border-black bg-white text-sm outline-none cursor-pointer"
                      value={newClientId}
                      onChange={e => setNewClientId(e.target.value)}
                    >
                      <option value="">— {newRole === 'Client' ? 'Select company (required)' : 'No company'} —</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Dispatcher — Technician only. Admin already has full access. Client never dispatches. */}
                  {newRole === 'Technician' && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 border-2 border-purple-300 rounded">
                      <div>
                        <span className="text-xs font-mono font-bold text-purple-900 block">DISPATCHER ACCESS</span>
                        <span className="text-[10px] font-mono text-purple-600">Grants visibility of all queues &amp; unrouted tickets</span>
                      </div>
                      <button type="button" onClick={() => setNewHasAllQueueAccess(!newHasAllQueueAccess)}
                        className={`px-3 py-1 border-2 border-black font-bold text-[11px] uppercase cursor-pointer transition-all ${newHasAllQueueAccess ? 'bg-purple-600 text-white' : 'bg-white text-black'}`}>
                        {newHasAllQueueAccess ? '✓ ON' : 'OFF'}
                      </button>
                    </div>
                  )}

                  <button type="submit" disabled={actionLoading} className="w-full py-2.5 bg-brand-olive hover:bg-[#a2bf7c] text-black border-2 border-black font-bold uppercase text-sm flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                    <Plus className="w-4 h-4" /> Create User Account
                  </button>
                </form>
              )}

              {/* ── CSV Import ── */}
              {bulkTab === 'csv' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#f0ede4] border-2 border-black rounded font-mono text-xs space-y-1">
                    <p className="font-bold text-sm mb-2">CSV Format Requirements</p>
                    <p>Required columns: <code className="bg-white px-1 border border-gray-300">name, email, password, role</code></p>
                    <p>Optional columns: <code className="bg-white px-1 border border-gray-300">clientId, hasAllQueueAccess</code></p>
                    <p className="text-gray-600">role must be: <code className="bg-white px-1">Client</code>, <code className="bg-white px-1">Technician</code>, or <code className="bg-white px-1">Admin</code></p>
                    <p className="text-gray-600">hasAllQueueAccess: <code className="bg-white px-1">true</code> or <code className="bg-white px-1">false</code></p>
                    <div className="pt-2 border-t border-black/20">
                      <p className="font-bold mb-1">Example:</p>
                      <code className="block bg-white p-2 border border-gray-300 text-[10px] leading-relaxed whitespace-pre">name,email,password,role
John Doe,john@acme.com,Pass123,Technician
Jane Smith,jane@acme.com,Pass456,Admin</code>
                    </div>
                  </div>
                  <label className="block w-full py-6 border-2 border-dashed border-black bg-[#fcfcfa] hover:bg-[#f0ede4] transition-all cursor-pointer text-center rounded">
                    <span className="text-sm font-bold font-mono block">Click to upload CSV file</span>
                    <span className="text-xs text-gray-500 font-mono block mt-1">Max 500 users per file</span>
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCSVUpload} />
                  </label>
                  {bulkRows.length > 0 && (
                    <div className="p-3 bg-green-50 border-2 border-green-600 rounded flex items-center justify-between">
                      <span className="text-sm font-mono font-bold text-green-800">✓ {bulkRows.length} rows parsed — switch to Bulk Preview to review</span>
                      <button onClick={() => setBulkTab('bulk')} className="text-xs font-bold border-2 border-green-700 px-3 py-1 bg-green-700 text-white cursor-pointer">Review →</button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Bulk Preview & Submit ── */}
              {bulkTab === 'bulk' && (
                <div className="space-y-3">
                  {bulkRows.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 font-mono text-sm">
                      <p>No rows loaded. Upload a CSV file first.</p>
                      <button onClick={() => setBulkTab('csv')} className="mt-3 text-xs font-bold border-2 border-black px-4 py-1.5 bg-[#efeee7] hover:bg-gray-200 cursor-pointer">← Go to CSV Import</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-mono">{bulkRows.length} users queued for import</span>
                        <div className="flex gap-2">
                          <button onClick={() => { setBulkRows([]); setBulkTab('csv'); }} className="text-xs font-mono border-2 border-black px-3 py-1 bg-[#efeee7] hover:bg-gray-200 cursor-pointer">Clear</button>
                          <button onClick={handleBulkSubmit} disabled={actionLoading} className="text-xs font-bold border-2 border-black px-4 py-1.5 bg-black text-white hover:bg-gray-900 cursor-pointer flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Import All
                          </button>
                        </div>
                      </div>
                      <div className="overflow-auto max-h-64 border-2 border-black">
                        <table className="w-full text-[11px] font-mono border-collapse">
                          <thead>
                            <tr className="bg-black text-white">
                              {['#', 'Name', 'Email', 'Role', 'Dispatcher'].map(h => (
                                <th key={h} className="px-2 py-1.5 text-left font-bold border-r border-gray-700 last:border-r-0">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {bulkRows.map((row, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-2 py-1 border-r border-gray-200 text-gray-400">{idx + 1}</td>
                                <td className="px-2 py-1 border-r border-gray-200 font-bold">{row.name}</td>
                                <td className="px-2 py-1 border-r border-gray-200 text-blue-700">{row.email}</td>
                                <td className="px-2 py-1 border-r border-gray-200">
                                  <span className={`px-1.5 py-0.5 font-bold border ${
                                    row.role === 'Admin' ? 'bg-red-100 border-red-400 text-red-800' :
                                    row.role === 'Technician' ? 'bg-blue-100 border-blue-400 text-blue-800' :
                                    'bg-gray-100 border-gray-400'
                                  }`}>{row.role}</span>
                                </td>
                                <td className="px-2 py-1">{row.hasAllQueueAccess ? '✓' : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Bulk result summary */}
                  {bulkResult && (
                    <div className="mt-3 p-4 border-2 border-black bg-[#fcfcfa] space-y-2">
                      <p className="font-bold font-mono text-sm">Import Result</p>
                      <div className="flex gap-4 text-xs font-mono">
                        <span className="text-gray-600">Total: <b>{bulkResult.summary.total}</b></span>
                        <span className="text-green-700">Created: <b>{bulkResult.summary.created}</b></span>
                        <span className="text-red-700">Failed: <b>{bulkResult.summary.failed}</b></span>
                      </div>
                      {bulkResult.failed.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          {bulkResult.failed.map((f, i) => (
                            <div key={i} className="text-[10px] font-mono text-red-800 bg-red-50 border border-red-200 px-2 py-1 mb-1">
                              <b>{f.email}</b>: {f.reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── User Directory ── */}
            <div className="bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
              <div className="flex flex-col gap-3 mb-4 border-b-2 border-black pb-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <Users className="w-6 h-6 text-brand-olive" /> User Directory <span className="text-gray-500 text-lg font-mono">({filteredUsers.length} / {users.length})</span>
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Search name, email, or company..."
                    value={userFilter}
                    onChange={e => setUserFilter(e.target.value)}
                    className="p-2 border-2 border-black bg-[#efeee7] text-xs font-mono outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] min-w-[200px] flex-1 transition-all text-black"
                  />
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="p-2 border-2 border-black bg-[#efeee7] text-xs font-mono outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-black cursor-pointer"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="Technician">Technician</option>
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Client">Client</option>
                  </select>
                  <select
                    value={companyFilter}
                    onChange={e => setCompanyFilter(e.target.value)}
                    className="p-2 border-2 border-black bg-[#efeee7] text-xs font-mono outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-black cursor-pointer max-w-[200px]"
                  >
                    <option value="ALL">All Companies</option>
                    <option value="SYSTEM">System level (No Company)</option>
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  {(userFilter || roleFilter !== "ALL" || companyFilter !== "ALL") && (
                    <button
                      onClick={() => {
                        setUserFilter("");
                        setRoleFilter("ALL");
                        setCompanyFilter("ALL");
                      }}
                      className="p-2 text-xs font-mono font-bold border-2 border-black bg-[#ffcccb] hover:bg-red-300 transition-all cursor-pointer text-black"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[680px] overflow-y-auto pr-1 space-y-3">
                {usersLoading ? (
                  <span className="text-xs font-mono text-gray-500 block animate-pulse py-4 text-center">Loading registered identities...</span>
                ) : filteredUsers.length === 0 ? (
                  <span className="text-xs font-mono text-gray-500 block py-4 text-center">No users match the active filters.</span>
                ) : (
                  filteredUsers
                    .map((u) => {
                      const isEditing = editingUserId === u._id;
                      const isConfirmDelete = deleteConfirmId === u._id;
                      const isSelf = u._id === user?._id;
                      return (
                        <div key={u._id} className="p-4 border-2 border-black bg-white flex flex-col gap-2 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <span className="font-bold font-sans text-sm block truncate">{u.name}</span>
                              <span className="text-xs text-gray-500 font-mono block truncate">{u.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {u.hasAllQueueAccess && (
                                <span className="text-[9px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-400 px-1.5 py-0.5 uppercase">Dispatcher</span>
                              )}
                              <span className={`text-[10px] font-mono font-bold border border-black uppercase px-2 py-0.5 ${
                                u.role === 'Admin' ? 'bg-red-500 text-white' :
                                u.role === 'Technician' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                              }`}>{u.role}</span>
                            </div>
                          </div>

                          <div className="text-xs font-mono text-gray-700 bg-gray-50 p-2 border border-gray-200">
                            {u.role === "Client"
                              ? <span>COMPANY: <span className="font-bold text-black">{u.clientId?.name || "Unassigned"}</span></span>
                              : <span>SYSTEM LEVEL PRIVILEGES</span>}
                          </div>

                          {/* Edit form */}
                          {isEditing && (
                            <div className="mt-1 p-3 bg-[#fcfcfa] border border-dashed border-gray-400 rounded space-y-3 font-mono text-xs">
                              <div className="flex items-center justify-between gap-4">
                                <span>ROLE:</span>
                                <select className="p-1.5 border border-black bg-white" value={editRole} onChange={e => setEditRole(e.target.value as any)}>
                                  <option value="Client">Client</option>
                                  <option value="Technician">Technician</option>
                                  <option value="Admin">Admin</option>
                                </select>
                              </div>
                              {/* Company — required for Client, optional for Technician/Admin */}
                              <div className="flex items-center justify-between gap-4">
                                <span>COMPANY:</span>
                                <select
                                  className="p-1.5 border border-black bg-white w-2/3"
                                  value={editClientId}
                                  onChange={e => setEditClientId(e.target.value)}
                                >
                                  <option value="">— {editRole === 'Client' ? 'Required' : 'None'} —</option>
                                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                              </div>

                              {/* Dispatcher — Technician only */}
                              {editRole === 'Technician' && (
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <span className="block">DISPATCHER ACCESS:</span>
                                    <span className="text-[9px] text-gray-500">Technician-only permission</span>
                                  </div>
                                  <button type="button" onClick={() => setEditHasAllQueueAccess(!editHasAllQueueAccess)}
                                    className={`px-3 py-1 border-2 border-black font-bold text-[11px] uppercase cursor-pointer transition-all ${editHasAllQueueAccess ? 'bg-purple-600 text-white' : 'bg-gray-100 text-black'}`}>
                                    {editHasAllQueueAccess ? '✓ ENABLED' : 'DISABLED'}
                                  </button>
                                </div>
                              )}

                              {/* Info note for Admin — they have full access without the flag */}
                              {editRole === 'Admin' && (
                                <div className="text-[10px] font-mono text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded">
                                  Admins have full system access by role — no dispatcher flag needed.
                                </div>
                              )}
                              <div className="flex justify-end gap-2 pt-1">
                                <button onClick={() => setEditingUserId(null)} className="px-3 py-1 border border-black text-black bg-white text-[11px] font-bold uppercase cursor-pointer">Cancel</button>
                                <button
                                  onClick={() => {
                                    fetch(`/api/v1/admin/users/${u._id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({
                                        role: editRole,
                                        clientId: editClientId || undefined,
                                        // Only Technicians can be dispatchers; clear flag for other roles
                                        hasAllQueueAccess: editRole === 'Technician' ? editHasAllQueueAccess : false
                                      })
                                    }).then(() => { setSuccessMsg('User updated!'); setEditingUserId(null); loadAdminData(); });
                                  }}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-brand-olive text-black border border-black text-[11px] font-bold uppercase cursor-pointer"
                                >Save Changes</button>
                              </div>
                            </div>
                          )}

                          {/* Delete confirm */}
                          {isConfirmDelete && (
                            <div className="p-3 bg-red-50 border-2 border-red-500 rounded flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-bold text-red-800">Delete this user permanently?</span>
                              <div className="flex gap-2">
                                <button onClick={() => setDeleteConfirmId(null)} className="text-[10px] font-bold px-2 py-1 border border-black bg-white cursor-pointer">No, cancel</button>
                                <button onClick={() => handleDeleteUser(u._id)} className="text-[10px] font-bold px-2 py-1 border border-red-700 bg-red-600 text-white cursor-pointer">Yes, delete</button>
                              </div>
                            </div>
                          )}

                          {/* Action buttons row */}
                          {!isEditing && !isConfirmDelete && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => startEditingUser(u)} className="text-[10px] font-mono font-bold uppercase border-2 border-black px-3 py-1 bg-[#efeee7] hover:bg-gray-200 cursor-pointer">Edit</button>
                              {!isSelf && (
                                <button onClick={() => setDeleteConfirmId(u._id)} className="text-[10px] font-mono font-bold uppercase border-2 border-black px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer">Delete</button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
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
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="w-full p-1.5 border-2 border-black bg-white outline-none text-xs font-mono mb-2 placeholder-gray-500 text-black"
                    value={createQueueMemberSearch}
                    onChange={e => setCreateQueueMemberSearch(e.target.value)}
                  />
                  <div className="max-h-40 overflow-y-auto border-2 border-black p-2 space-y-1 bg-gray-50">
                    {users
                      .filter(u => u.role === 'Technician' || u.role === 'Admin')
                      .filter(u => {
                        const s = createQueueMemberSearch.toLowerCase().trim();
                        if (!s) return true;
                        return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
                      })
                      .map(u => (
                        <label key={u._id} className="flex items-center gap-2 text-xs font-mono cursor-pointer hover:bg-gray-100 p-0.5">
                          <input type="checkbox" checked={queueMembers.includes(u._id)} onChange={e => {
                            if (e.target.checked) setQueueMembers(m => [...m, u._id]);
                            else setQueueMembers(m => m.filter(id => id !== u._id));
                          }} />
                          <span className="font-bold text-black">{u.name}</span>
                          <span className="text-gray-500 text-[10px]">&lt;{u.email}&gt;</span>
                          <span className="text-gray-400 font-sans">({u.role})</span>
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
                            <button onClick={() => { setEditingQueueId(q._id); setEditQueueName(q.name); setEditQueueColor(q.color); setEditQueueMembers(q.members.map(m => m._id)); setEditQueueMemberSearch(""); }} className="text-[10px] font-mono font-bold border-2 border-black px-2 py-1 bg-[#efeee7] hover:bg-gray-200 cursor-pointer">Edit</button>
                            <button onClick={() => handleDeleteQueue(q._id, q.name)} className="text-[10px] font-mono font-bold border-2 border-black px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer">Delete</button>
                          </div>
                        </div>

                        {!isEditing && q.members.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {q.members.map(m => (
                              <span key={m._id} className="text-[10px] font-mono bg-gray-100 border border-gray-300 px-1.5 py-0.5" title={m.email}>{m.name}</span>
                            ))}
                          </div>
                        )}

                        {isEditing && (
                          <div className="mt-3 pt-3 border-t border-dashed border-gray-400 space-y-2 font-mono text-xs">
                            <div className="flex gap-2">
                              <input type="text" className="flex-1 p-1.5 border-2 border-black bg-white text-black font-sans text-sm" value={editQueueName} onChange={e => setEditQueueName(e.target.value)} />
                              <input type="color" className="w-10 h-[38px] p-0.5 border-2 border-black cursor-pointer" value={editQueueColor} onChange={e => setEditQueueColor(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Search by name or email..."
                                className="w-full p-1.5 border-2 border-black bg-white outline-none text-xs font-mono placeholder-gray-500 text-black mb-2"
                                value={editQueueMemberSearch}
                                onChange={e => setEditQueueMemberSearch(e.target.value)}
                              />
                              <div className="max-h-32 overflow-y-auto border-2 border-black p-2 space-y-1 bg-gray-50">
                                {users
                                  .filter(u => u.role === 'Technician' || u.role === 'Admin')
                                  .filter(u => {
                                    const s = editQueueMemberSearch.toLowerCase().trim();
                                    if (!s) return true;
                                    return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
                                  })
                                  .map(u => (
                                    <label key={u._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-0.5 text-xs text-black">
                                      <input type="checkbox" checked={editQueueMembers.includes(u._id)} onChange={e => {
                                        if (e.target.checked) setEditQueueMembers(m => [...m, u._id]);
                                        else setEditQueueMembers(m => m.filter(id => id !== u._id));
                                      }} />
                                      <span className="font-bold">{u.name}</span>
                                      <span className="text-gray-500 text-[10px]">&lt;{u.email}&gt;</span>
                                    </label>
                                  ))}
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => { setEditingQueueId(null); setEditQueueMemberSearch(""); }} className="px-3 py-1 border border-black bg-white font-bold uppercase text-[10px] cursor-pointer">Cancel</button>
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
