// socket.js
const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000', // Update with your React Native app's URL or IP
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  });

  io.on('connection', (socket) => {
    // console.log(`User connected: ${socket.id}`);

    socket.on('delivered', (status) => {
      io.emit("SKresponse", status);
    });

    socket.on('SupplierProductAltered', (status) => {
      io.emit('dashBoardSupplierRender', status)
    });

    socket.on('ShopkeeperProductAltered', (status) => {
      io.emit('dashBoardShopkeeperRender', status)
    });

    socket.on('disconnect', () => {
      // console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getSocketInstance = () => {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initializeSocket first.");
  }
  return io;
};

module.exports = { initializeSocket, getSocketInstance };
