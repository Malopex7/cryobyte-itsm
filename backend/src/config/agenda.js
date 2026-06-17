import Agenda from 'agenda';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/overwatch-db';

const agenda = new Agenda({
  db: {
    address: mongoUri,
    collection: 'agendaJobs'
  },
  processEvery: '10 seconds' // scan for jobs every 10 seconds to detect 60s crons promptly
});

agenda.on('start', (job) => {
  console.log(`[Agenda] Job "${job.attrs.name}" is starting...`);
});

agenda.on('complete', (job) => {
  console.log(`[Agenda] Job "${job.attrs.name}" completed successfully`);
});

agenda.on('fail', (err, job) => {
  console.error(`[Agenda] Job "${job.attrs.name}" failed with error: ${err.message}`);
});

export default agenda;
