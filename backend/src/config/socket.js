const { Server } = require('socket.io');
const { log } = require('../utils/logger');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        log(`⚡ Socket connected: ${socket.id}`);

        // PM joins their personal room using userId
        socket.on('join', (userId) => {
            socket.join(userId);
            log(`👤 User ${userId} joined their room`);
        });

        socket.on('disconnect', () => {
            log(`❌ Socket disconnected: ${socket.id}`);
        });
    });

    log('✅ Socket.io initialized');
    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

module.exports = { initSocket, getIO };