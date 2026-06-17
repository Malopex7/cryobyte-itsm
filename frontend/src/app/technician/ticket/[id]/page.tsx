"use client";

import React, { useState, useEffect, use } from 'react';
import { useSocket } from '../../../../hooks/useSocket';
import { useStore } from '../../../../store';
import { Lock } from 'lucide-react';
import AssetPreview from '../../../../components/tickets/AssetPreview';

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default function TicketDetail({ params }: TicketPageProps) {
  const { id: ticketId } = use(params);
  const { user } = useStore();
  const { emit } = useSocket();
  const [resolutionText, setResolutionText] = useState("");
  
  // Lock state
  const [lockedBy, setLockedBy] = useState<string | null>(null);

  // Listen for lock events
  useSocket('field-locked', (data: any) => {
    if (data.ticketId === ticketId && data.field === 'resolution') {
      setLockedBy(data.userName);
    }
  });

  useSocket('field-unlocked', (data: any) => {
    if (data.ticketId === ticketId && data.field === 'resolution') {
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

  return (
    <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] p-8 font-sans">
      <div className="max-w-[1000px] mx-auto bg-white brutalist-border p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <span className="font-mono text-sm bg-black text-white px-2 py-1 mb-2 inline-block">
              {ticketId}
            </span>
            <h1 className="text-3xl font-black">Ticket Details</h1>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <label className="block font-bold text-lg mb-2">Resolution Notes</label>
            
            {/* Lock Indicator */}
            {lockedBy && (
              <div className="absolute right-2 top-0 text-red-600 font-bold flex items-center gap-1 animate-pulse text-sm bg-red-100 px-2 py-1 border border-red-300">
                <Lock className="w-4 h-4" />
                Locked by {lockedBy}
              </div>
            )}
            
            <textarea
              className={`w-full p-4 border-2 outline-none font-mono text-sm min-h-[200px] transition-colors ${
                lockedBy 
                  ? 'border-red-600 bg-red-50 cursor-not-allowed opacity-70' 
                  : 'border-black focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
              }`}
              placeholder={lockedBy ? `Currently being edited by ${lockedBy}...` : "Type resolution steps here..."}
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={!!lockedBy}
            />
          </div>

          {/* Attachments Section */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">Attachments</h2>
            {/* Hardcoded sample attachments for UI demonstration. In production, these come from ticket.assets array. */}
            <AssetPreview 
              fileId="sample-image-123" 
              filename="error-screenshot.png" 
              contentType="image/png" 
            />
            <AssetPreview 
              fileId="sample-log-456" 
              filename="server-trace.log" 
              contentType="text/plain" 
            />
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button className="px-6 py-2 border-2 border-black font-bold hover:bg-gray-100">
              Save Draft
            </button>
            <button className="px-6 py-2 bg-brand-olive border-2 border-black font-bold hover:bg-[#b6d094] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
              Resolve Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
