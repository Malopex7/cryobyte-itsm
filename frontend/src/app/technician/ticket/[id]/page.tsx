"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSocket } from '../../../../hooks/useSocket';
import { useStore, Ticket, Queue } from '../../../../store';
import { Lock } from 'lucide-react';
import AssetPreview from '../../../../components/tickets/AssetPreview';
import SlaCountdown from '../../../../components/tickets/SlaCountdown';
import PriorityMatrix, { Level } from '../../../../components/forms/PriorityMatrix';

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default function TicketDetail({ params }: TicketPageProps) {
  const router = useRouter();
  const { id: ticketId } = use(params);
  const { user, token, logout, updateTicket } = useStore();
  const { emit } = useSocket();
  const [resolutionText, setResolutionText] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<{ _id: string; name: string; email: string; clientId?: { _id: string; name: string } | string | null }[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  
  // Lock state
  const [lockedBy, setLockedBy] = useState<string | null>(null);

  // Fetch ticket details
  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${token}` };

    const fetchTicket = async () => {
      try {
        const response = await fetch(`/api/v1/tickets/${ticketId}`, { headers, cache: 'no-store' });
        const data = await response.json();
        if (response.ok) {
          setTicket(data.data.ticket);
          const qId = data.data.ticket.queueId?._id || data.data.ticket.queueId;
          const cId = data.data.ticket.clientId?._id || data.data.ticket.clientId;
          fetchSupportData(qId, cId);
        } else {
          console.error('Failed to fetch ticket:', data.message);
          fetchSupportData();
        }
      } catch (err) {
        console.error('Error fetching ticket:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSupportData = async (qId?: string, cId?: string) => {
      try {
        let url = '/api/v1/tickets/technicians';
        const params = new URLSearchParams();
        if (qId) params.append('queueId', qId);
        if (cId) params.append('clientId', cId);
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const [resTechs, resQueues] = await Promise.all([
          fetch(url, { headers }),
          fetch('/api/v1/queues', { headers })
        ]);
        if (resTechs.ok) {
          const d = await resTechs.json();
          setTechnicians(d.data.technicians || []);
        }
        if (resQueues.ok) {
          const d = await resQueues.json();
          setQueues(d.data.queues || []);
        }
      } catch (err) {
        console.error('Error fetching support data:', err);
      }
    };

    if (token && ticketId) {
      fetchTicket();
    }
  }, [token, ticketId]);

  // Real-time socket sync for ticket updates
  useSocket('ticket:updated', (updatedTicket: unknown) => {
    const ticketDoc = updatedTicket as Ticket;
    if (ticketDoc._id === ticketId) {
      setTicket(ticketDoc);
      updateTicket(ticketDoc);
    }
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    logout();
    router.push('/login');
  };

  // Handle assignment update (cross-assign to any technician)
  const handleAssign = async (technicianId: string | null) => {
    setActionError(null);
    try {
      const response = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ assignedTechnicianId: technicianId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update ticket assignment');
      setTicket(data.data.ticket);
      updateTicket(data.data.ticket);
    } catch (err) {
      console.error('Assignment error:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to update assignment.');
    }
  };

  // Handle queue routing (dispatcher / admin only)
  const handleQueueChange = async (newQueueId: string | null) => {
    setActionError(null);
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    try {
      const response = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ queueId: newQueueId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update queue');

      setTicket(data.data.ticket);
      updateTicket(data.data.ticket);
      const qId = data.data.ticket.queueId?._id || data.data.ticket.queueId;
      const cId = data.data.ticket.clientId?._id || data.data.ticket.clientId;
      if (qId) {
        let techUrl = `/api/v1/tickets/technicians?queueId=${qId}`;
        if (cId) techUrl += `&clientId=${cId}`;
        const techRes = await fetch(techUrl, { headers });
        if (techRes.ok) {
          const techData = await techRes.json();
          setTechnicians(techData.data.technicians || []);
        }
      }

    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update queue assignment.');
    }
  };

  // Handle status updates (for pausing/resuming SLA clock)
  const handleStatusChange = async (newStatus: string, reason?: string) => {
    try {
      const response = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          note: reason
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update ticket status');
      }
      setTicket(data.data.ticket);
      updateTicket(data.data.ticket);
      setResolutionText(""); // Clear text area
    } catch (err) {
      console.error('Status change error:', err);
      setActionError(err instanceof Error ? err.message : 'An error occurred while updating status.');
    }
  };

  const handlePriorityUpdate = async (urgency: Level, impact: Level) => {
    try {
      const response = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          matrix: { urgency, impact }
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update priority');
      }
      setTicket(data.data.ticket);
      updateTicket(data.data.ticket);
    } catch (err) {
      console.error('Priority update error:', err);
      setActionError(err instanceof Error ? err.message : 'An error occurred while updating priority.');
    }
  };

  // Handle adding manual technician notes
  const handleAddNote = async () => {
    if (!resolutionText.trim()) {
      setActionError("Please enter some work notes before submitting.");
      return;
    }
    try {
      const response = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          note: resolutionText.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add note');
      }
      setTicket(data.data.ticket);
      updateTicket(data.data.ticket);
      setResolutionText(""); // Clear text area
    } catch (err) {
      console.error('Add note error:', err);
      setActionError(err instanceof Error ? err.message : 'An error occurred while adding note.');
    }
  };

  // Handle resolving the ticket
  const handleResolve = async () => {
    if (!resolutionText.trim()) {
      setActionError("A resolution note is required to resolve the ticket.");
      return;
    }

    try {
      const response = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'Resolved',
          note: resolutionText.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to resolve ticket');
      }
      setTicket(data.data.ticket);
      updateTicket(data.data.ticket);
      setResolutionText(""); // Clear text area
    } catch (err) {
      console.error('Resolve ticket error:', err);
      setActionError(err instanceof Error ? err.message : 'An error occurred while resolving ticket.');
    }
  };

  // Listen for lock events
  useSocket('field-locked', (data) => {
    const typedData = data as { ticketId: string; field: string; userName: string };
    if (typedData.ticketId === ticketId && typedData.field === 'resolution') {
      setLockedBy(typedData.userName);
    }
  });

  useSocket('field-unlocked', (data) => {
    const typedData = data as { ticketId: string; field: string };
    if (typedData.ticketId === ticketId && typedData.field === 'resolution') {
      setLockedBy(null);
    }
  });

  const handleFocus = () => {
    if (lockedBy) return; // Cannot focus if someone else locked it
    emit('field-focus', { 
      ticketId, 
      field: 'resolution', 
      userName: user?.name || 'Anonymous Tech' 
    });
  };

  const handleBlur = () => {
    emit('field-blur', { 
      ticketId, 
      field: 'resolution' 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] flex flex-col justify-center items-center font-mono text-sm">
        <div className="flex items-center gap-3 bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
          <span className="w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full"></span>
          <span className="font-bold">Establishing Ticket Stream...</span>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] flex flex-col justify-center items-center font-sans">
        <div className="bg-white brutalist-border p-8 text-center max-w-[500px]">
          <h2 className="text-2xl font-black mb-4">Incident Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">The requested ticket could not be found or you do not have permission to view it.</p>
          <Link href="/technician/dashboard" className="px-6 py-2 bg-black text-white font-bold border-2 border-black inline-block cursor-pointer">
            Return to War Room
          </Link>
        </div>
      </div>
    );
  }

  const assignedTech = ticket.assignedTechnicianId;
  const isAssignedToMe = assignedTech && (typeof assignedTech === 'object' ? assignedTech._id === user?._id : assignedTech === user?._id);

  const canChangePriority = user?.role === 'Admin' || 
    (user?.role === 'Technician' && !ticket.assignedTechnicianId && !ticket.hasTechChangedPriority);

  return (
    <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] p-8 font-sans">
      <div className="max-w-[1000px] mx-auto">
        {/* Top Header Panel */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white brutalist-border p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] gap-4 rounded-lg">
          <div className="flex items-center gap-4">
            <Link href="/technician/dashboard" className="text-xs font-mono font-bold uppercase border-2 border-black px-3 py-1.5 bg-[#efeee7] hover:bg-gray-200">
              ← War Room
            </Link>
            <div className="font-mono text-xs">
              <span className="text-gray-500 font-bold">SESSION: </span>
              <span className="font-bold text-green-700">CONNECTED</span>
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

        <div className="bg-white brutalist-border p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start md:items-end flex-col md:flex-row gap-4">
            <div>
              <span className="font-mono text-xs bg-black text-white px-2 py-1 mb-2 inline-block">
                {ticket.ticketId || ticketId}
              </span>
              <h1 className="text-3xl font-black tracking-tight">{ticket.subject}</h1>
              <p className="text-xs text-gray-500 font-mono mt-1">
                Logged: {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2 font-mono text-xs">
              <span className={`px-3 py-1 font-bold border-2 border-black ${
                ticket.priority === 'P1' ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 text-black'
              }`}>
                {ticket.priority || 'P4'}
              </span>
              <span className="px-3 py-1 bg-brand-almond border-2 border-black text-black uppercase font-bold">
                {ticket.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
            {/* Left Column: Description & Company */}
            <div className="md:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono mb-1">
                  Client Company
                </label>
                <div className="p-3 border-2 border-black bg-gray-50 font-mono text-sm">
                  {ticket.clientId && typeof ticket.clientId === 'object' ? ticket.clientId.name : 'Unknown Client'}
                </div>
              </div>

              {ticket.status === 'Waiting on Client' && ticket.pauseReason && (
                <div className="p-3 border-2 border-amber-500 bg-amber-50 text-amber-950 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(217,119,6,1)] rounded">
                  <span className="block text-amber-800 uppercase tracking-widest text-[10px] mb-1">SLA PAUSED REASON</span>
                  &quot;{ticket.pauseReason}&quot;
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono mb-1">
                  Incident Description
                </label>
                <div className="p-4 border-2 border-black bg-gray-50 text-sm whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </div>
              </div>
            </div>

            {/* Right Column: Assignment Controls & SLA */}
            <div className="md:col-span-4 space-y-4">
              <div className="border-2 border-black p-4 bg-brand-almond/20 rounded">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono mb-2">
                  Assignment Console
                </label>
                
                <div className="space-y-3 font-mono text-xs">
                  {/* Cross-assign dropdown */}
                  <div>
                    <span className="text-gray-500 block mb-1">Assigned Technician:</span>
                    <select
                      value={ticket.assignedTechnicianId && typeof ticket.assignedTechnicianId === 'object'
                        ? ticket.assignedTechnicianId._id
                        : (ticket.assignedTechnicianId as string) || ''}
                      onChange={(e) => handleAssign(e.target.value || null)}
                      className="w-full p-2 border-2 border-black bg-white text-xs font-mono focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    >
                      <option value="">— Unassigned —</option>
                      {technicians
                        .filter(t => {
                          const ticketClientId = ticket.clientId && typeof ticket.clientId === 'object' ? ticket.clientId._id : ticket.clientId;
                          const techClientId = t.clientId && typeof t.clientId === 'object' ? t.clientId._id : t.clientId;
                          return !techClientId || techClientId === ticketClientId;
                        })
                        .map(t => (
                          <option key={t._id} value={t._id}>
                            {t.name}{t._id === user?._id ? ' (me)' : ''}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Quick Claim / Release */}
                  <div className="pt-1">
                    {isAssignedToMe ? (
                      <button
                        onClick={() => handleAssign(null)}
                        className="w-full text-xs font-bold bg-[#ffcccb] hover:bg-red-300 text-black border-2 border-black py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer text-center"
                      >
                        Release Incident
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAssign(user?._id || null)}
                        className="w-full text-xs font-bold bg-[#b6d094] hover:bg-[#a2bf7c] text-black border-2 border-black py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer text-center"
                      >
                        {ticket.assignedTechnicianId ? 'Take Over Incident' : 'Claim Incident'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Queue Routing — Dispatcher & Admin only */}
              {(user?.role === 'Admin' || user?.hasAllQueueAccess) && (
                <div className="border-2 border-black p-4 bg-white rounded">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono mb-2">
                    Queue Routing
                  </label>
                  <div className="space-y-2">
                    {ticket.queueId && typeof ticket.queueId === 'object' && (
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-3 h-3 rounded-full border border-black flex-shrink-0"
                          style={{ backgroundColor: ticket.queueId.color }}
                        />
                        <span className="font-bold font-mono text-xs">{ticket.queueId.name}</span>
                      </div>
                    )}
                    {!ticket.queueId && (
                      <div className="text-xs font-mono text-amber-700 font-bold bg-amber-50 border border-amber-400 px-2 py-1 rounded mb-2">
                        ⚠ UNQUEUED — Assign to a queue
                      </div>
                    )}
                    <select
                      value={ticket.queueId && typeof ticket.queueId === 'object' ? ticket.queueId._id : (ticket.queueId as string) || ''}
                      onChange={(e) => handleQueueChange(e.target.value || null)}
                      className="w-full p-2 border-2 border-black bg-white text-xs font-mono focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    >
                      <option value="">— Unqueued —</option>
                      {queues
                        .filter(q => q.isActive)
                        .filter(q => {
                          const clientName = (ticket.clientId && typeof ticket.clientId === 'object' ? ticket.clientId.name : '').toLowerCase();
                          if (!clientName) return true;
                          const parts = q.name.split(' - ');
                          const queueCompany = (parts.length > 1 ? parts[1].trim() : q.name).toLowerCase();
                          return clientName.includes(queueCompany) || queueCompany.includes(clientName);
                        })
                        .map(q => (
                          <option key={q._id} value={q._id}>{q.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              )}
              {/* Non-dispatcher: show which queue this ticket belongs to */}
              {user?.role === 'Technician' && !user?.hasAllQueueAccess && ticket.queueId && typeof ticket.queueId === 'object' && (
                <div className="border-2 border-black p-3 bg-white rounded flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full border border-black flex-shrink-0"
                    style={{ backgroundColor: ticket.queueId.color }}
                  />
                  <span className="font-bold font-mono text-xs">{ticket.queueId.name}</span>
                </div>
              )}

              {canChangePriority && (
                <div className="border-2 border-black p-4 bg-white rounded">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono mb-2">
                    Update Priority
                  </label>
                  <p className="text-xs text-gray-500 mb-4 font-mono">
                    {user?.role === 'Admin' ? 'Admins can update priority freely.' : 'Technicians can change priority ONCE before claiming.'}
                  </p>
                  <PriorityMatrix
                    urgency={ticket.matrix.urgency as Level}
                    impact={ticket.matrix.impact as Level}
                    onChange={(u, i) => {
                      if (window.confirm("Are you sure you want to change the priority?")) {
                        handlePriorityUpdate(u, i);
                      }
                    }}
                  />
                </div>
              )}

              {ticket.sla && (
                <div className="border-2 border-black p-4 bg-white rounded">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono mb-2">
                    SLA Deadlines
                  </label>
                  <div className="space-y-2 font-mono text-xs">
                    {ticket.status !== 'Resolved' && ticket.status !== 'Closed' ? (
                      <div>
                        {ticket.sla.resolveTarget ? (
                          <div className="flex justify-between items-center bg-gray-50 p-2 border border-black">
                            <span>Resolve target:</span>
                            <SlaCountdown 
                              targetDate={ticket.sla.resolveTarget} 
                              type="resolve" 
                              isBreached={ticket.sla.resolveBreached} 
                              isPaused={ticket.status === 'Waiting on Client'}
                              pausedAt={ticket.sla.pausedAt}
                            />
                          </div>
                        ) : ticket.sla.ackTarget ? (
                          <div className="flex justify-between items-center bg-gray-50 p-2 border border-black">
                            <span>Ack target:</span>
                            <SlaCountdown 
                              targetDate={ticket.sla.ackTarget} 
                              type="ack" 
                              isBreached={ticket.sla.ackBreached} 
                              isPaused={ticket.status === 'Waiting on Client'}
                              pausedAt={ticket.sla.pausedAt}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="p-2 bg-green-50 border border-green-500 text-green-700 font-bold text-center uppercase">
                        SLA Cleared
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-2 border-black p-4 bg-[#efeee7] rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono mb-3 border-b-2 border-black pb-1">
                  Lifecycle Milestones
                </label>
                <div className="space-y-3 text-sm font-mono">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Logged:</span>
                    <span>{new Date(ticket.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {ticket.lifecycleTimestamps?.inProgressAt && (
                    <div className="flex justify-between items-center text-blue-800">
                      <span className="font-bold">In Progress:</span>
                      <span>{new Date(ticket.lifecycleTimestamps.inProgressAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {ticket.lifecycleTimestamps?.pendingAt && (
                    <div className="flex justify-between items-center text-amber-700">
                      <span className="font-bold">Pending:</span>
                      <span>{new Date(ticket.lifecycleTimestamps.pendingAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {ticket.lifecycleTimestamps?.resolvedAt && (
                    <div className="flex justify-between items-center text-green-700">
                      <span className="font-bold">Resolved:</span>
                      <span>{new Date(ticket.lifecycleTimestamps.resolvedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {ticket.lifecycleTimestamps?.closedAt && (
                    <div className="flex justify-between items-center text-gray-500">
                      <span className="font-bold">Closed:</span>
                      <span>{new Date(ticket.lifecycleTimestamps.closedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-lg">Work Note / Action Taken</label>
            </div>
            
            {actionError && (
              <div className="mb-4 bg-red-100 border-2 border-black p-3 flex justify-between items-start shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-bold text-red-800">{actionError}</span>
                <button 
                  onClick={() => setActionError(null)}
                  className="text-red-800 font-bold hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            )}
            
            {/* Lock Indicator */}
            {lockedBy && (
              <div className="text-red-600 font-bold flex items-center gap-1 animate-pulse text-sm bg-red-100 px-2 py-1 border border-red-300 mb-2">
                <Lock className="w-4 h-4" />
                Locked by {lockedBy}
              </div>
            )}
            
            <textarea
              className={`w-full p-4 border-2 outline-none font-mono text-sm min-h-[120px] transition-colors ${
                lockedBy 
                  ? 'border-red-600 bg-red-50 cursor-not-allowed opacity-70' 
                  : 'border-black focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white text-black'
              }`}
              placeholder={lockedBy ? `Currently being edited by ${lockedBy}...` : "Type work notes, pause reasons, or resolution details here..."}
              value={resolutionText}
              onChange={(e) => {
                setResolutionText(e.target.value);
                if (actionError) setActionError(null);
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={!!lockedBy}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6 flex-wrap">
            <Link 
              href="/technician/dashboard"
              className="px-6 py-2 border-2 border-black font-bold hover:bg-gray-100 text-center flex items-center justify-center cursor-pointer text-black"
            >
              Back to Dashboard
            </Link>
            {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
              <>
                <button 
                  onClick={handleAddNote}
                  className="px-6 py-2 bg-[#efeee7] border-2 border-black font-bold hover:bg-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer text-black"
                >
                  Add Work Note
                </button>
                {ticket.status === 'Waiting on Client' ? (
                  <button 
                    onClick={() => handleStatusChange('In Progress')}
                    className="px-6 py-2 bg-brand-bronze text-black border-2 border-black font-bold hover:bg-brand-bronze/80 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
                  >
                    Resume SLA (In Progress)
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if (!resolutionText.trim()) {
                        setActionError("Please enter a pause reason in the Work Note textarea first.");
                        return;
                      }
                      handleStatusChange('Waiting on Client', resolutionText.trim());
                    }}
                    className="px-6 py-2 bg-amber-400 text-black border-2 border-black font-bold hover:bg-amber-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
                  >
                    Pause SLA (Pending)
                  </button>
                )}
                {ticket.status !== 'Waiting on Client' && (
                  <button 
                    onClick={handleResolve}
                    className="px-6 py-2 bg-brand-olive border-2 border-black font-bold hover:bg-[#b6d094] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
                  >
                    Resolve Ticket
                  </button>
                )}
              </>
            )}
          </div>

          {/* Activity Log / Audit Trail Timeline */}
          <div className="mt-8 border-t-2 border-black pt-6">
            <h2 className="text-xl font-bold mb-4">Activity Log & Audit Trail</h2>
            {ticket.notes && ticket.notes.length > 0 ? (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {[...(ticket.notes || [])].reverse().map((note) => {
                  const isSystem = note.type === 'system';
                  return (
                    <div 
                      key={note._id} 
                      className={`p-3 border-2 border-black rounded text-xs font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        isSystem ? 'bg-[#efeee7] text-slate-700' : 'bg-white text-black'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5 border-b border-black/10 pb-1">
                        <span className="font-bold uppercase flex items-center gap-1.5">
                          {isSystem ? (
                            <span className="px-1.5 py-0.5 bg-black text-white text-[9px] rounded font-bold">SYSTEM</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-brand-olive text-black text-[9px] rounded font-bold">TECH NOTE</span>
                          )}
                          {note.author}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{note.text}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 font-mono text-xs">No activity logged yet.</p>
            )}
          </div>

          {/* Attachments Section */}
          <div className="mt-8 border-t-2 border-black pt-6">
            <h2 className="text-xl font-bold mb-4">Attachments</h2>

            {ticket.attachments && ticket.attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(ticket.attachments || []).map((asset) => (
                  <AssetPreview 
                    key={asset.fileId || ''}
                    fileId={asset.fileId || ''} 
                    filename={asset.filename || ''} 
                    contentType={asset.contentType || ''} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 font-mono text-xs">No attachments uploaded for this incident.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
