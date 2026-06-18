import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Technician' | 'Client';
  clientId?: { _id: string; name: string } | string;
  hasAllQueueAccess?: boolean;
}

export interface Queue {
  _id: string;
  name: string;
  description?: string;
  color: string;
  members: { _id: string; name: string; email: string; role: string }[];
  isActive: boolean;
}

export interface Ticket {
  _id: string;
  ticketId: string;
  subject: string;
  description: string;
  status: 'New' | 'In Progress' | 'Waiting on Client' | 'Resolved' | 'Closed';
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  matrix: {
    impact: number;
    urgency: number;
    priority: 'P1' | 'P2' | 'P3' | 'P4';
  };
  hasTechChangedPriority?: boolean;
  queueId?: { _id: string; name: string; color: string } | string | null;
  sla: {
    ackTarget?: string;
    resolveTarget?: string;
    ackBreached: boolean;
    resolveBreached: boolean;
    pausedAt?: string | null;
  };
  clientId: any;
  assignedTechnicianId?: {
    _id: string;
    name: string;
    email: string;
  } | string | null;
  pauseReason?: string | null;
  lifecycleTimestamps?: {
    inProgressAt?: string | Date;
    pendingAt?: string | Date;
    resolvedAt?: string | Date;
    closedAt?: string | Date;
  };
  createdAt: string;
  updatedAt: string;
  notes?: {
    _id?: string;
    text: string;
    author: string;
    type: 'system' | 'technician';
    createdAt: string;
  }[];
  attachments?: {
    fileId?: string;
    filename?: string;
    contentType?: string;
  }[];
}

export interface FilterState {
  status?: string;
  priority?: string;
  search?: string;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;

  // Tickets
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (ticket: Ticket) => void;
  setSelectedTicket: (ticket: Ticket | null) => void;

  // Filtering
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;

  // Loading States
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),

      // Tickets
      tickets: [],
      selectedTicket: null,
      setTickets: (tickets) => set({ tickets }),
      addTicket: (ticket) => set((state) => ({ tickets: [ticket, ...state.tickets] })),
      updateTicket: (updatedTicket) => set((state) => ({
        tickets: state.tickets.map((t) => (t._id === updatedTicket._id ? updatedTicket : t)),
        selectedTicket: state.selectedTicket?._id === updatedTicket._id ? updatedTicket : state.selectedTicket,
      })),
      setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),

      // Filtering
      filters: {},
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      clearFilters: () => set({ filters: {} }),

      // Loading States
      isLoading: false,
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'overwatch-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated,
        tickets: state.tickets,
        selectedTicket: state.selectedTicket
      }),
    }
  )
);
