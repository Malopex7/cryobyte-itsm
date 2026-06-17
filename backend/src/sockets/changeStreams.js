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
      Ticket.findById(ticketDoc._id)
        .populate('clientId', 'name')
        .populate('assignedTechnicianId', 'name email')
        .then(populatedTicket => {
          if (populatedTicket) {
            if (change.operationType === 'insert') {
              io.emit('ticket-created', populatedTicket);
              io.emit('ticket:created', populatedTicket);
            } else if (change.operationType === 'update') {
              io.emit('ticket-updated', populatedTicket);
              io.emit('ticket:updated', populatedTicket);
            }
          }
        })
        .catch(err => console.error('Error populating change stream ticket:', err));
    }
  });

  changeStream.on('error', (error) => {
    console.error('MongoDB Change Stream Error:', error);
  });

  return changeStream;
};
