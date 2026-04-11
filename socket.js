const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    },
    // Prevent rapid reconnection loops when multiple clients connect
    pingTimeout: 60000,
    pingInterval: 25000,
    // Allow both transports for reliability
    transports: ['websocket', 'polling'],
    // Ensure stable connections by allowing upgrades
    allowUpgrades: true,
    // Increase per-message deflate threshold to reduce overhead
    perMessageDeflate: false
  });

  // Track connected clients
  io.on('connection', (socket) => {
    const clientCount = io.engine.clientsCount;
    console.log(`🔌 Client connected: ${socket.id} (total: ${clientCount})`);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`🔌 Socket error for ${socket.id}:`, error.message);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
};

const getIO = () => io;

/**
 * Safely emit a socket event. No-ops if socket isn't initialized.
 */
const emit = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = { initSocket, getIO, emit };
