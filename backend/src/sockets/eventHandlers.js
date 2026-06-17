// Map to track active locks by socket ID to ensure clean release on disconnect
const activeLocks = new Map();

export const registerPresenceHandlers = (io, socket) => {
  // When a technician focuses on an input field
  socket.on('field-focus', ({ ticketId, field, userName }) => {
    if (!ticketId || !field) return;

    const lockKey = `${ticketId}:${field}`;
    if (!activeLocks.has(socket.id)) {
      activeLocks.set(socket.id, new Set());
    }
    activeLocks.get(socket.id).add(lockKey);

    console.log(`[Presence] Socket ${socket.id} (${userName}) focused on ${lockKey}`);

    // Broadcast lock status to all other connected users
    socket.broadcast.emit('field-locked', {
      ticketId,
      field,
      userName,
      socketId: socket.id
    });
  });

  // When a technician leaves / blurs an input field
  socket.on('field-blur', ({ ticketId, field }) => {
    if (!ticketId || !field) return;

    const lockKey = `${ticketId}:${field}`;
    if (activeLocks.has(socket.id)) {
      activeLocks.get(socket.id).delete(lockKey);
    }

    console.log(`[Presence] Socket ${socket.id} blurred ${lockKey}`);

    // Broadcast unlock status to all other connected users
    socket.broadcast.emit('field-unlocked', {
      ticketId,
      field,
      socketId: socket.id
    });
  });

  // When a technician disconnects, release all their active locks automatically
  socket.on('disconnect', () => {
    const userLocks = activeLocks.get(socket.id);
    if (userLocks && userLocks.size > 0) {
      console.log(`[Presence] Socket ${socket.id} disconnected. Releasing ${userLocks.size} locks.`);
      for (const lockKey of userLocks) {
        const [ticketId, field] = lockKey.split(':');
        socket.broadcast.emit('field-unlocked', {
          ticketId,
          field,
          socketId: socket.id
        });
      }
    }
    activeLocks.delete(socket.id);
  });
};
