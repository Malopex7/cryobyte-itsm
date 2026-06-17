import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './src/models/Client.js';
import Ticket from './src/models/Ticket.js';
import agenda from './src/config/agenda.js';
import defineSlaWatchdog from './src/jobs/slaWatchdog.js';

dotenv.config();

// Define jobs on the test agenda instance
defineSlaWatchdog(agenda);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Database connected.');

  // Initialize Agenda database connection
  await agenda.start();
  console.log('Agenda started.');

  // Create a test client
  console.log('Creating test client...');
  const testClient = new Client({
    name: `Test SLA Client - ${Date.now()}`
  });
  await testClient.save();
  console.log(`Test client created: ${testClient._id}`);

  // Create test ticket 1: New status with expired ackTarget
  console.log('Creating ticket 1 (ack breach)...');
  const ackTargetDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
  const resolveTargetDate1 = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in the future
  const ticket1 = new Ticket({
    clientId: testClient._id,
    subject: 'SLA Ack Breach Test Ticket',
    description: 'This ticket should breach its acknowledgement target.',
    matrix: { impact: 3, urgency: 3 }, // P1
    sla: {
      ackTarget: ackTargetDate,
      ackBreached: false,
      resolveTarget: resolveTargetDate1,
      resolveBreached: false
    }
  });
  await ticket1.save();
  console.log(`Ticket 1 created: ${ticket1.ticketId} (_id: ${ticket1._id})`);

  // Create test ticket 2: In Progress status with expired resolveTarget
  console.log('Creating ticket 2 (resolve breach)...');
  const ackTargetDate2 = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
  const resolveTargetDate2 = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
  const ticket2 = new Ticket({
    clientId: testClient._id,
    subject: 'SLA Resolve Breach Test Ticket',
    description: 'This ticket should breach its resolution target.',
    matrix: { impact: 3, urgency: 3 }, // P1
    status: 'In Progress',
    sla: {
      ackTarget: ackTargetDate2,
      ackBreached: true, // Already acknowledged
      resolveTarget: resolveTargetDate2,
      resolveBreached: false
    }
  });
  await ticket2.save();
  console.log(`Ticket 2 created: ${ticket2.ticketId} (_id: ${ticket2._id})`);

  // Create test ticket 3: Waiting on Client with expired resolveTarget (should NOT breach because SLA clock is paused)
  console.log('Creating ticket 3 (no breach due to paused state)...');
  const ticket3 = new Ticket({
    clientId: testClient._id,
    subject: 'SLA Paused Test Ticket',
    description: 'This ticket should NOT breach because its status is Waiting on Client.',
    matrix: { impact: 3, urgency: 3 }, // P1
    status: 'Waiting on Client',
    sla: {
      ackTarget: ackTargetDate2,
      ackBreached: true,
      resolveTarget: resolveTargetDate2, // Expired, but status is Waiting on Client
      resolveBreached: false
    }
  });
  await ticket3.save();
  console.log(`Ticket 3 created: ${ticket3.ticketId} (_id: ${ticket3._id})`);

  // Run the check-sla-breaches job manually via Agenda
  console.log('Triggering "check-sla-breaches" job manually...');
  await agenda.now('check-sla-breaches');
  
  // Wait a moment for Agenda to process the job
  console.log('Waiting for job to complete...');
  await sleep(3000);

  // Retrieve tickets and verify mutations
  console.log('Retrieving tickets from DB to check breach status...');
  const updatedTicket1 = await Ticket.findById(ticket1._id);
  const updatedTicket2 = await Ticket.findById(ticket2._id);
  const updatedTicket3 = await Ticket.findById(ticket3._id);

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log(`Ticket 1 (${updatedTicket1.ticketId} - New): ackBreached = ${updatedTicket1.sla.ackBreached} (Expected: true)`);
  console.log(`Ticket 2 (${updatedTicket2.ticketId} - In Progress): resolveBreached = ${updatedTicket2.sla.resolveBreached} (Expected: true)`);
  console.log(`Ticket 3 (${updatedTicket3.ticketId} - Waiting on Client): resolveBreached = ${updatedTicket3.sla.resolveBreached} (Expected: false)`);

  let success = true;
  if (updatedTicket1.sla.ackBreached !== true) {
    console.error('FAIL: Ticket 1 ackBreached is not true!');
    success = false;
  }
  if (updatedTicket2.sla.resolveBreached !== true) {
    console.error('FAIL: Ticket 2 resolveBreached is not true!');
    success = false;
  }
  if (updatedTicket3.sla.resolveBreached !== false) {
    console.error('FAIL: Ticket 3 resolveBreached is true (should be false)!');
    success = false;
  }

  if (success) {
    console.log('\nSUCCESS: All SLA watchdog tests passed successfully!');
  } else {
    console.error('\nFAILURE: Some SLA watchdog tests failed.');
  }

  // Cleanup
  console.log('\nCleaning up test documents...');
  await Ticket.deleteMany({ clientId: testClient._id });
  await Client.findByIdAndDelete(testClient._id);
  console.log('Cleanup complete.');

  // Stop Agenda and close mongoose connection
  await agenda.stop();
  await mongoose.disconnect();
  console.log('Disconnected from database.');
}

runTest().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
