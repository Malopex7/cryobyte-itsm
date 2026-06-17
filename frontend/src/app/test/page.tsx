'use client';

import { useState, useCallback } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useSocketContext } from '../../contexts/SocketContext';

interface Ticket {
  _id: string;
  ticketId: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  updatedAt: string;
}

export default function RealTimeTestPage() {
  const { isConnected, socket } = useSocketContext();
  const [ticketLogs, setTicketLogs] = useState<Ticket[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Field Presence States
  const [resolutionText, setResolutionText] = useState('');
  const [isFieldLocked, setIsFieldLocked] = useState(false);
  const [lockedByUser, setLockedByUser] = useState('');
  const [simulateRemoteUser, setSimulateRemoteUser] = useState(false);

  const testTicketId = '60d0fe4f5311236168a109ca'; // Dummy ObjectId for testing

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // 1. Listen to 'ticket-updated' from Mongoose Change Streams
  const handleTicketUpdated = useCallback((updatedTicket: Ticket) => {
    setTicketLogs((prev) => [updatedTicket, ...prev.slice(0, 4)]);
  }, []);

  useSocket('ticket-updated', handleTicketUpdated);

  // 2. Listen to presence lock events
  const handleFieldLocked = useCallback((data: { ticketId: string; field: string; userName: string }) => {
    if (data.ticketId === testTicketId && data.field === 'resolution') {
      setIsFieldLocked(true);
      setLockedByUser(data.userName);
    }
  }, []);

  const handleFieldUnlocked = useCallback((data: { ticketId: string; field: string }) => {
    if (data.ticketId === testTicketId && data.field === 'resolution') {
      setIsFieldLocked(false);
      setLockedByUser('');
    }
  }, []);

  useSocket('field-locked', handleFieldLocked);
  useSocket('field-unlocked', handleFieldUnlocked);

  // 3. Emit local focus/blur events
  const handleFocus = () => {
    if (socket && !isFieldLocked) {
      socket.emit('field-focus', {
        ticketId: testTicketId,
        field: 'resolution',
        userName: 'Technician Me (You)'
      });
    }
  };

  const handleBlur = () => {
    if (socket) {
      socket.emit('field-blur', {
        ticketId: testTicketId,
        field: 'resolution'
      });
    }
  };

  // 4. Simulate a remote user locking the field
  const toggleRemoteSimulation = () => {
    if (!socket) return;
    
    if (!simulateRemoteUser) {
      // Send focus event as if we are "Technician Alice"
      socket.emit('field-focus', {
        ticketId: testTicketId,
        field: 'resolution',
        userName: 'Technician Alice'
      });
      setSimulateRemoteUser(true);
    } else {
      // Send blur event
      socket.emit('field-blur', {
        ticketId: testTicketId,
        field: 'resolution'
      });
      setSimulateRemoteUser(false);
    }
  };

  // 5. Trigger MongoDB ticket update
  const triggerTicketUpdate = async () => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${apiUrl}/api/test/update-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Failed to update ticket: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Ticket updated API response:', data);
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'API request failed');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans antialiased">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Overwatch Real-Time Sync Console</h1>
          <p className="text-sm text-slate-400 mt-2">
            Testing MongoDB Change Streams, Socket.io Broadcasts, and Field-Level Presence.
          </p>
        </div>

        {/* Status Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider block">Socket Server URL</span>
            <span className="text-lg font-mono text-slate-200 mt-1 block">{apiUrl}</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-md border border-slate-850">
            <span className={`w-3.5 h-3.5 rounded-full block ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-sm font-bold tracking-wide">
              {isConnected ? 'LIVE / CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Presence & UI Locking */}
          <div className="bg-slate-900 border border-slate-850 rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Field Presence Simulator</h2>
              <p className="text-xs text-slate-400 mt-1">
                Technician B&apos;s screen locks when Technician A focuses on a field.
              </p>
            </div>

            {/* Simulated field */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300 block">Resolution Notes</label>
              <div className="relative">
                <textarea
                  className={`w-full h-32 px-3 py-2 bg-slate-950 border text-slate-100 rounded-md font-mono text-sm focus:outline-none transition-colors ${
                    isFieldLocked 
                      ? 'border-rose-500/50 focus:border-rose-500/50 cursor-not-allowed opacity-60' 
                      : 'border-slate-800 focus:border-indigo-500'
                  }`}
                  placeholder={isFieldLocked ? 'Field locked. Waiting for technician...' : 'Enter ticket resolution here...'}
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  disabled={isFieldLocked}
                />
                
                {isFieldLocked && (
                  <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] rounded-md pointer-events-none flex items-center justify-center">
                    <span className="bg-rose-950/90 border border-rose-800 text-rose-200 text-xs px-3 py-1.5 rounded-md font-bold flex items-center gap-2">
                      🔒 {lockedByUser} is typing...
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-400 block leading-normal">
                Type inside the box above. It emits focus/blur events to the server.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-805 space-y-3">
              <button
                onClick={toggleRemoteSimulation}
                className={`w-full py-2.5 px-4 rounded font-bold text-sm transition-colors cursor-pointer ${
                  simulateRemoteUser
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {simulateRemoteUser 
                  ? '⏹️ Stop Remote User Typing' 
                  : '👤 Simulate Technician Alice Typing (Locks Field)'}
              </button>
            </div>
          </div>

          {/* Right Column: Change Streams Live Log */}
          <div className="bg-slate-900 border border-slate-855 rounded-lg p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Change Streams Feed</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Listens to `tickets` collection updates via Mongoose Watch.
                </p>
              </div>
              <button
                onClick={triggerTicketUpdate}
                disabled={isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3.5 rounded cursor-pointer transition-colors disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : '⚡ Trigger DB Update'}
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-950/50 border border-rose-900 text-rose-350 p-3 rounded text-xs">
                Error: {errorMsg}
              </div>
            )}

            {/* Log Feed */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Latest Mongo Updates Received:
              </span>
              
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {ticketLogs.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
                    No updates detected yet. Click &quot;Trigger DB Update&quot; above.
                  </div>
                ) : (
                  ticketLogs.map((log, index) => (
                    <div 
                      key={`${log._id}-${index}`} 
                      className="bg-slate-950 border border-slate-800 rounded p-3 space-y-2 animate-fadeIn"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-400 font-mono">{log.ticketId}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.updatedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-200">
                        {log.subject}
                      </div>
                      <div className="flex gap-2">
                        <span className="bg-slate-900 text-slate-450 border border-slate-800 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                          {log.status}
                        </span>
                        <span className="bg-slate-900 text-indigo-300 border border-slate-800 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                          {log.priority}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
