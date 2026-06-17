"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore, Ticket } from '../../../store';
import { useSocket } from '../../../hooks/useSocket';

import SlaCountdown from '../../../components/tickets/SlaCountdown';

export default function TechnicianDashboard() {
  const router = useRouter();
  const { tickets, setTickets, updateTicket, addTicket, user, token, logout } = useStore();

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    logout();
    router.push('/login');
  };

  // Fetch initial tickets from backend
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch('/api/v1/tickets', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setTickets(data.data.tickets || []);
        }
      } catch (err) {
        console.error('Failed to load technician incident queue:', err);
      }
    };

    if (token) {
      fetchTickets();
    }
  }, [token, setTickets]);

  // Real-time socket listeners for new tickets and updates
  useSocket('ticket:created', (newTicket) => addTicket(newTicket as Ticket));
  useSocket('ticket:updated', (updatedTicket) => updateTicket(updatedTicket as Ticket));

  // Sort tickets: P1 at the top, then P2, P3, P4
  const priorityOrder: Record<string, number> = { 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4 };
  
  const sortedTickets = [...tickets].sort((a, b) => {
    const pA = priorityOrder[a.matrix?.priority || 'P4'] || 4;
    const pB = priorityOrder[b.matrix?.priority || 'P4'] || 4;
    return pA - pB;
  });

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

        <h1 className="text-4xl font-black tracking-tighter mb-8">Technician War Room</h1>
        
        <div className="bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">Active Incidents Queue</h2>
          
          <div className="space-y-4">
            {sortedTickets.length === 0 ? (
              <p className="text-gray-500 font-mono text-sm py-4">No active incidents found in queue.</p>
            ) : (
              sortedTickets.map(ticket => {
                const isBreached = ticket.sla?.resolveBreached || ticket.sla?.ackBreached;
                const priorityBg = ticket.matrix?.priority === 'P1' ? 'bg-[#ffcccb]' : 'bg-white';
                
                return (
                  <div 
                    key={ticket._id} 
                    className={`p-4 border-2 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between gap-4 ${
                      isBreached ? 'bg-red-600 animate-pulse text-white border-red-900' : `border-black text-[#1b1c18] ${priorityBg}`
                    }`}
                  >
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`font-mono text-sm font-bold px-2 py-0.5 ${
                          isBreached ? 'bg-white text-red-600' : 'bg-black text-white'
                        }`}>
                          {ticket.ticketId || 'INC-UNKNOWN'}
                        </span>
                      <h3 className="font-bold text-lg">{ticket.subject}</h3>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{ticket.description}</p>
                  </div>
                  
                  <div className="flex items-center md:flex-col justify-between md:justify-end gap-2 text-right">
                    {ticket.sla?.resolveTarget ? (
                      <SlaCountdown 
                        targetDate={ticket.sla.resolveTarget} 
                        type="resolve" 
                        isBreached={ticket.sla.resolveBreached} 
                      />
                    ) : ticket.sla?.ackTarget ? (
                      <SlaCountdown 
                        targetDate={ticket.sla.ackTarget} 
                        type="ack" 
                        isBreached={ticket.sla.ackBreached} 
                      />
                    ) : null}
                    <span className={`px-3 py-1 text-sm font-bold border-2 border-black inline-block text-center ${
                      ticket.matrix?.priority === 'P1' ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200'
                    }`}>
                      {ticket.matrix?.priority || 'Unassigned'}
                    </span>
                    <span className="text-xs font-mono font-semibold uppercase px-2 py-1 bg-brand-almond border border-black">
                      {ticket.status}
                    </span>
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
