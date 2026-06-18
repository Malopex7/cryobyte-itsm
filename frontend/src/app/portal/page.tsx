"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore, Ticket } from "../../store";
import { useSocket } from "../../hooks/useSocket";
import FileUpload, { UploadedAsset } from "../../components/forms/FileUpload";
import SlaCountdown from "../../components/tickets/SlaCountdown";
import { AlertCircle, CheckCircle, FileText, Send, HelpCircle } from "lucide-react";

export default function ClientPortal() {
  const router = useRouter();
  const { user, token, logout } = useStore();

  // Ticket Intake State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<UploadedAsset[]>([]);

  // Page States
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load client's tickets on mount
  useEffect(() => {
    const fetchMyTickets = async () => {
      setTicketsLoading(true);
      try {
        const response = await fetch("/api/v1/tickets", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to load tickets");
        setMyTickets(data.data.tickets || []);
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Failed to retrieve your company's ticket queue.");
      } finally {
        setTicketsLoading(false);
      }
    };

    if (token) {
      fetchMyTickets();
    }
  }, [token]);

  // Real-time socket sync
  useSocket("ticket:created", (newTicket: any) => {
    // Check if ticket belongs to the user's client group
    const ticketDoc = newTicket as Ticket;
    if (ticketDoc.clientId === user?.clientId || (typeof ticketDoc.clientId === "object" && (ticketDoc.clientId as any)._id === user?.clientId)) {
      setMyTickets((prev) => [ticketDoc, ...prev]);
    }
  });

  useSocket("ticket:updated", (updatedTicket: any) => {
    const ticketDoc = updatedTicket as Ticket;
    setMyTickets((prev) =>
      prev.map((t) => (t._id === ticketDoc._id ? ticketDoc : t))
    );
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    logout();
    router.push("/login");
  };



  const handleUploadComplete = (assets: UploadedAsset[]) => {
    setAttachments(assets);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/v1/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          description,
          matrix: { urgency: 1, impact: 1 },
          attachments,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit ticket.");
      }

      setSuccessMsg(`Ticket ${data.data.ticket.ticketId} successfully submitted!`);
      
      // Clear Form
      setSubject("");
      setDescription("");
      setAttachments([]);

      // Scroll list into view or let sockets handle insert
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred while saving the ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf2] text-[#1b1c18] p-6 font-sans">
      <div className="max-w-[1400px] mx-auto">
        {/* Top Header Panel */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white brutalist-border p-4 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] gap-4 rounded-lg">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs font-mono font-bold uppercase border-2 border-black px-3 py-1.5 bg-[#efeee7] hover:bg-gray-200">
              ← Main Site
            </Link>
            <div className="font-mono text-xs">
              <span className="text-gray-500 font-bold">PORTAL: </span>
              <span className="font-bold text-green-700">CLIENT SELF-SERVICE</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Submit Ticket Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
              <h2 className="text-2xl font-black mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                <FileText className="w-6 h-6" /> Submit Support Ticket
              </h2>

              {errorMsg && (
                <div className="mb-4 p-4 bg-red-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm flex items-start gap-2 text-red-950 font-semibold">
                  <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-4 bg-green-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm flex items-start gap-2 text-green-950 font-semibold animate-pulse">
                  <CheckCircle className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">
                    Subject / Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary of the issue (e.g. Cannot log in to HR portal)"
                    className="w-full p-3 bg-white border-2 border-black rounded outline-none font-sans text-sm focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono">
                    Description of Incident
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide details about the issue. Include error codes, steps to reproduce, or system messages."
                    className="w-full p-3 bg-white border-2 border-black rounded outline-none font-sans text-sm focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitting}
                  />
                </div>



                {/* File Dropzone Upload */}
                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#44483d] font-mono mb-2">
                    Attach Log Files / Screenshots
                  </label>
                  <FileUpload
                    onUploadComplete={handleUploadComplete}
                    maxFiles={3}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-brand-olive hover:bg-[#a2bf7c] text-black border-2 border-black py-4 px-6 font-black uppercase tracking-widest text-sm rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Submitting Incident..." : "Submit Incident Report"}
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Ticket History Queue */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white brutalist-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
              <h2 className="text-2xl font-black mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                <HelpCircle className="w-6 h-6" /> Your Company Tickets
              </h2>

              <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
                {ticketsLoading ? (
                  <div className="py-8 text-center text-gray-500 font-mono text-xs animate-pulse">
                    Querying ticket databases...
                  </div>
                ) : myTickets.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-gray-300 rounded text-gray-400 font-mono text-xs">
                    No support tickets logged.
                  </div>
                ) : (
                  myTickets.map((ticket) => {
                    const isP1 = ticket.priority === "P1";
                    return (
                      <div
                        key={ticket._id}
                        className={`p-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white flex flex-col gap-2 transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                          isP1 ? "bg-red-50" : ""
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-black text-white rounded">
                            {ticket.ticketId}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm line-clamp-1">{ticket.subject}</h3>
                        <p className="text-xs text-gray-655 line-clamp-2">{ticket.description}</p>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 border border-black uppercase ${
                            ticket.priority === 'P1' ? 'bg-red-500 text-white animate-pulse' :
                            ticket.priority === 'P2' ? 'bg-orange-400 text-white' :
                            ticket.priority === 'P3' ? 'bg-yellow-400 text-black' : 'bg-green-400 text-black'
                          }`}>
                            {ticket.priority}
                          </span>

                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-gray-100 border border-gray-300 rounded font-semibold text-gray-700">
                            {ticket.status}
                          </span>
                        </div>

                        {ticket.status !== "Resolved" && ticket.status !== "Closed" && (
                          <div className="text-right text-[10px] pt-1">
                            {ticket.sla?.resolveTarget ? (
                              <SlaCountdown
                                targetDate={ticket.sla.resolveTarget}
                                type="resolve"
                                isBreached={ticket.sla.resolveBreached}
                                isPaused={ticket.status === 'Waiting on Client'}
                                pausedAt={ticket.sla.pausedAt}
                              />
                            ) : null}
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
      </div>
    </div>
  );
}
