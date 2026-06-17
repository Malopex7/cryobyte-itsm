import Ticket from '../models/Ticket.js';

export const initChangeStreams = (io) => {
  console.log('Initializing Ticket Change Stream watcher...');
  
  const changeStream = Ticket.watch(
    [
      { $match: { operationType: { $in: ['insert', 'update'] } } }
    ],
    { fullDocument: 'updateLookup' }
  );

  changeStream.on('change', (change) => {
    console.log(`Change Stream intercepted ${change.operationType} for Ticket ${change.documentKey._id}`);
    
    const ticketDoc = change.fullDocument;
    
    if (ticketDoc) {
      if (change.operationType === 'insert') {
        io.emit('ticket-created', ticketDoc);
        io.emit('ticket:created', ticketDoc);
      } else if (change.operationType === 'update') {
        io.emit('ticket-updated', ticketDoc);
        io.emit('ticket:updated', ticketDoc);
      }
    }
  });

  changeStream.on('error', (error) => {
    console.error('MongoDB Change Stream Error:', error);
  });

  return changeStream;
};
