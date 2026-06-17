"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore, Ticket, Queue } from '../../../store';
import { useSocket } from '../../../hooks/useSocket';
import SlaCountdown from '../../../components/tickets/SlaCountdown';

export default function TechnicianDashboard() {
  const router = useRouter();
  const { tickets, setTickets, updateTicket, addTicket, user, token, logout } = useStore();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [activeQueueFilter, setActiveQueueFilter] = useState<string | null>(null); // null = "All / Unqueued"
  const [searchQuery, setSearchQuery] = useState('');

  const isDispatcher = user?.role === 'Admin' || user?.hasAllQueueAccess;

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    logout();
    router.push('/login');
  };

  // Fetch tickets and queues on mount
  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${token}` };

    const fetchTickets = async () => {
      try {
        const response = await fetch('/api/v1/tickets', { headers, cache: 'no-store' });
        const data = await response.json();
        if (response.ok) setTickets(data.data.tickets || []);
      } catch (err) {
        console.error('Failed to load incident queue:', err);
      }
    };

    const fetchQueues = async () => {
      try {
        const response = await fetch('/api/v1/queues', { headers });
        const data = await response.json();
        if (response.ok) setQueues(data.data.queues || []);
      } catch (err) {
        console.error('Failed to load queues:', err);
      }
    };

    if (token) {
      fetchTickets();
      fetchQueues();
    }
  }, [token, setTickets]);

  // Real-time socket listeners
  useSocket('ticket:created', (newTicket) => addTicket(newTicket as Ticket));
  useSocket('ticket:updated', (updatedTicket) => updateTicket(updatedTicket as Ticket));

  // Handle quick-assign from dashboard card
  const handleAssign = async (ticketId: string, technicianId: string | null) => {
    try {
      const response = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ assignedTechnicianId: technicianId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update assignment');
      updateTicket(data.data.ticket);
    } catch (err) {
      console.error('Assignment error:', err);
    }
  };

  // Filtering logic
  const filteredTickets = tickets.filter(ticket => {
    // Search override
    if (searchQuery.trim()) {
      return (
        ticket.ticketId?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
    }

    // Hide resolved/closed by default
    if (ticket.status === 'Resolved' || ticket.status === 'Closed') return false;

    // Queue filter
    if (activeQueueFilter === 'unqueued') return !ticket.queueId;
    if (activeQueueFilter) {
      const tqid = ticket.queueId && typeof ticket.queueId === 'object' ? ticket.queueId._id : ticket.queueId;
      return tqid === activeQueueFilter;
    }

    return true;
  });

  const priorityOrder: Record<string, number> = { 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4 };
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const pA = priorityOrder[a.priority || 'P4'] || 4;
    const pB = priorityOrder[b.priority || 'P4'] || 4;
    return pA - pB;
  });

  const unqueuedCount = tickets.filter(t => !t.queueId && t.status !== 'Resolved' && t.status !== 'Closed').length;

  return (
    <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] p-8 font-sans">
      <div className="max-w-[1440px] mx-auto">
        {/* Top Header Panel */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white brutalist-border p-4 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] gap-4 rounded-lg">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs font-mono font-bold uppercase border-2 border-black px-3 py-1.5 bg-[#efeee7] hover:bg-gray-200">
              ← Main Site
            </Link>
            <div className="font-mono text-xs">
              <span className="text-gray-500 font-bold">SESSION: </span>
              <span className="font-bold text-green-700">CONNECTED</span>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            {user && (
              <div className="font-mono text-xs flex items-center gap-2">
                <span className="font-bold">{user.name}</span>
                <span className="text-gray-500">({user.role})</span>
                {isDispatcher && user.role !== 'Admin' && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-800 text-[10px] font-bold uppercase">Dispatcher</span>
                )}
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

        <h1 className="text-4xl font-black tracking-tighter mb-8">Technician War Room</h1>

        <div className="bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-sans">
          {/* Queue Filter Tabs */}
          <div className="mb-6 border-b-2 border-black pb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setActiveQueueFilter(null)}
                className={`text-xs font-bold font-mono px-3 py-1.5 border-2 border-black transition-all cursor-pointer ${
                  activeQueueFilter === null ? 'bg-black text-white' : 'bg-[#efeee7] hover:bg-gray-200'
                }`}
              >
                ALL QUEUES
              </button>

              {isDispatcher && (
                <button
                  onClick={() => setActiveQueueFilter('unqueued')}
                  className={`text-xs font-bold font-mono px-3 py-1.5 border-2 transition-all cursor-pointer flex items-center gap-1 ${
                    activeQueueFilter === 'unqueued'
                      ? 'bg-amber-500 text-black border-black'
                      : 'bg-amber-50 border-amber-500 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  ⚠ UNQUEUED
                  {unqueuedCount > 0 && (
                    <span className="bg-red-600 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{unqueuedCount}</span>
                  )}
                </button>
              )}

              {queues.filter(q => q.isActive).map(q => (
                <button
                  key={q._id}
                  onClick={() => setActiveQueueFilter(q._id)}
                  className={`text-xs font-bold font-mono px-3 py-1.5 border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeQueueFilter === q._id ? 'text-white' : 'bg-[#efeee7] hover:bg-gray-200'
                  }`}
                  style={activeQueueFilter === q._id ? { backgroundColor: q.color, borderColor: '#000' } : {}}
                >
                  <span className="w-2 h-2 rounded-full border border-current" style={{ backgroundColor: activeQueueFilter === q._id ? '#fff' : q.color }} />
                  {q.name.toUpperCase()}
                </button>
              ))}

              {/* Search */}
              <div className="ml-auto">
                <input
                  type="text"
                  placeholder="Search INC-XXXX or title..."
                  className="p-2 bg-[#efeee7] border-2 border-black rounded outline-none text-xs font-mono focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all placeholder-gray-500 text-black w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4">
            {activeQueueFilter === 'unqueued' ? '⚠ Unqueued — Awaiting Dispatch' :
             activeQueueFilter ? `Queue: ${queues.find(q => q._id === activeQueueFilter)?.name || ''}` :
             'Active Incidents Queue'}
          </h2>

          <div className="space-y-4">
            {sortedTickets.length === 0 ? (
              <p className="text-gray-500 font-mono text-sm py-4">
                {activeQueueFilter === 'unqueued' ? 'No unqueued tickets. All dispatched! 🎉' : 'No active incidents found in this queue.'}
              </p>
            ) : (
              sortedTickets.map(ticket => {
                const isBreached = ticket.sla?.resolveBreached || ticket.sla?.ackBreached;
                const priorityBg = ticket.priority === 'P1' ? 'bg-[#ffcccb]' : 'bg-white';
                const assignedTech = ticket.assignedTechnicianId;
                const isAssignedToMe = assignedTech && (typeof assignedTech === 'object' ? assignedTech._id === user?._id : assignedTech === user?._id);
                const assignedName = assignedTech && typeof assignedTech === 'object' ? assignedTech.name : 'Unknown';
                const queueObj = ticket.queueId && typeof ticket.queueId === 'object' ? ticket.queueId : null;

                return (
                  <div
                    key={ticket._id}
                    className={`p-4 border-2 transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between gap-4 ${
                      isBreached ? 'bg-red-600 animate-pulse text-white border-red-900' : `border-black text-[#1b1c18] ${priorityBg}`
                    }`}
                  >
                    <div className="flex-grow space-y-3">
                      <div>
                        <div className="flex items-center flex-wrap gap-3 mb-2">
                          <span className={`font-mono text-sm font-bold px-2 py-0.5 ${isBreached ? 'bg-white text-red-600' : 'bg-black text-white'}`}>
                            {ticket.ticketId || 'INC-UNKNOWN'}
                          </span>
                          <h3 className="font-bold text-lg">{ticket.subject}</h3>
                        </div>
                        <p className={`text-sm line-clamp-2 ${isBreached ? 'text-red-100' : 'text-gray-700'}`}>
                          {ticket.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center text-xs font-mono">
                        <span className={`px-2 py-0.5 border ${isBreached ? 'bg-red-950/50 border-white text-white' : 'bg-[#f0ede4] border-black text-[#1b1c18]'}`}>
                          COMPANY: {ticket.clientId && typeof ticket.clientId === 'object' ? ticket.clientId.name : 'Unknown'}
                        </span>

                        {/* Queue badge */}
                        {queueObj ? (
                          <span className="px-2 py-0.5 border border-black font-bold flex items-center gap-1 text-white" style={{ backgroundColor: queueObj.color }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/80 inline-block" />
                            {queueObj.name}
                          </span>
                        ) : isDispatcher ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-600 font-bold uppercase">⚠ Unqueued</span>
                        ) : null}

                        {/* Assignment badge */}
                        {isAssignedToMe ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 border border-green-800 font-bold uppercase">Assigned to You</span>
                        ) : assignedTech ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-800 font-bold uppercase">Assigned: {assignedName}</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-800 font-bold uppercase">Unassigned</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col justify-between items-stretch sm:items-center md:items-end gap-3 md:min-w-[220px]">
                      <div className="flex flex-row md:flex-col items-center md:items-end gap-2 justify-between w-full">
                        {ticket.status !== 'Resolved' && ticket.status !== 'Closed' ? (
                          ticket.sla?.resolveTarget ? (
                            <SlaCountdown targetDate={ticket.sla.resolveTarget} type="resolve" isBreached={ticket.sla.resolveBreached} isPaused={ticket.status === 'Waiting on Client'} pausedAt={ticket.sla.pausedAt} />
                          ) : ticket.sla?.ackTarget ? (
                            <SlaCountdown targetDate={ticket.sla.ackTarget} type="ack" isBreached={ticket.sla.ackBreached} isPaused={ticket.status === 'Waiting on Client'} pausedAt={ticket.sla.pausedAt} />
                          ) : <div />
                        ) : (
                          <span className="text-xs font-mono font-bold text-green-700 bg-green-50 border-2 border-green-700 px-2 py-1.5 uppercase tracking-wide rounded">SLA Cleared</span>
                        )}
                        <div className="flex gap-2">
                          <span className={`px-3 py-1 text-sm font-bold border-2 border-black inline-block text-center ${ticket.priority === 'P1' ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200'}`}>
                            {ticket.priority || 'P4'}
                          </span>
                          <span className="text-xs font-mono font-semibold uppercase px-2 py-1 bg-brand-almond border border-black text-black">
                            {ticket.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full justify-end">
                        {isAssignedToMe ? (
                          <button
                            onClick={() => handleAssign(ticket._id, null)}
                            className="text-xs font-bold bg-[#ffcccb] hover:bg-red-300 text-black border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
                          >
                            Release
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssign(ticket._id, user?._id || null)}
                            className="text-xs font-bold bg-[#b6d094] hover:bg-[#a2bf7c] text-black border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
                          >
                            {assignedTech ? 'Take Over' : 'Claim'}
                          </button>
                        )}
                        <Link
                          href={`/technician/ticket/${ticket._id}`}
                          className="text-xs font-bold bg-black text-white border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-center flex items-center cursor-pointer"
                        >
                          Enter Console
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
