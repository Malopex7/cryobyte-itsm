import Ticket from '../models/Ticket.js';

export default function(agenda) {
  agenda.define('check-sla-breaches', async (job) => {
    console.log('[SLA Watchdog] Running SLA breach scan...');
    const now = new Date();

    try {
      // 1. Find tickets that have breached their acknowledgement target
      // Conditions:
      // - Status is 'New'
      // - sla.ackTarget exists and is in the past (<= now)
      // - sla.ackBreached is not true (ne = not equal)
      const ackBreachedTickets = await Ticket.find({
        status: 'New',
        'sla.ackTarget': { $lte: now },
        'sla.ackBreached': { $ne: true }
      });

      if (ackBreachedTickets.length > 0) {
        console.log(`[SLA Watchdog] Found ${ackBreachedTickets.length} tickets with breached ackTarget`);
        for (const ticket of ackBreachedTickets) {
          ticket.sla.ackBreached = true;
          // save() triggers schema pre-save hook and change stream
          await ticket.save();
          console.log(`[SLA Watchdog] Ticket ${ticket.ticketId} marked as ackBreached`);
        }
      }

      // 2. Find tickets that have breached their resolution target
      // Conditions:
      // - Status is not 'Resolved', 'Closed', 'Waiting on Client', or 'Waiting on Vendor'
      // - sla.resolveTarget exists and is in the past (<= now)
      // - sla.resolveBreached is not true
      const resolveBreachedTickets = await Ticket.find({
        status: { $nin: ['Resolved', 'Closed', 'Waiting on Client', 'Waiting on Vendor'] },
        'sla.resolveTarget': { $lte: now },
        'sla.resolveBreached': { $ne: true }
      });

      if (resolveBreachedTickets.length > 0) {
        console.log(`[SLA Watchdog] Found ${resolveBreachedTickets.length} tickets with breached resolveTarget`);
        for (const ticket of resolveBreachedTickets) {
          ticket.sla.resolveBreached = true;
          // save() triggers schema pre-save hook and change stream
          await ticket.save();
          console.log(`[SLA Watchdog] Ticket ${ticket.ticketId} marked as resolveBreached`);
        }
      }

      console.log('[SLA Watchdog] SLA breach scan completed successfully.');
    } catch (error) {
      console.error('[SLA Watchdog] Error running SLA breach scan:', error);
      throw error; // Let Agenda handle the job failure and retry if configured
    }
  });
}
