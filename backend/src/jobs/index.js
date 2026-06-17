import agenda from '../config/agenda.js';
import defineSlaWatchdog from './slaWatchdog.js';

// Define the jobs
defineSlaWatchdog(agenda);

export const initJobs = async () => {
  try {
    // Start Agenda
    await agenda.start();
    console.log('[Agenda] Scheduler started successfully');

    // Register check-sla-breaches to run every 60 seconds
    await agenda.every('60 seconds', 'check-sla-breaches');
    console.log('[Agenda] Registered "check-sla-breaches" job with 60-second interval');
  } catch (error) {
    console.error('[Agenda] Failed to initialize jobs:', error);
    throw error;
  }
};

// Graceful shutdown helper
export const gracefulShutdownJobs = async () => {
  console.log('[Agenda] Gracefully shutting down Agenda...');
  await agenda.stop();
  process.exit(0);
};
