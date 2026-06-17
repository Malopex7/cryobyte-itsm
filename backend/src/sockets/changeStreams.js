import Ticket from '../models/Ticket.js';

export const initChangeStreams = (io) => {
  console.log('Initializing Ticket Change Stream watcher...');
  
  const changeStream = Ticket.watch(
    [
      { $match: { operationType: 'update' } }
    ],
    { fullDocument: 'updateLookup' }
  );

  changeStream.on('change', (change) => {
    console.log(`Change Stream intercepted update for Ticket ${change.documentKey._id}`);
    
    // Retrieve the full updated document
    const updatedTicket = change.fullDocument;
    
    if (updatedTicket) {
      // Broadcast the updated ticket to all connected clients
      io.emit('ticket-updated', updatedTicket);
    }
  });

  changeStream.on('error', (error) => {
    console.error('MongoDB Change Stream Error:', error);
  });

  return changeStream;
};
