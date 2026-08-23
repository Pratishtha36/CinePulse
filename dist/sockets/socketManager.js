"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitSeatStatusUpdate = exports.getIO = exports.initSocketServer = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSocketServer = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        // Client joins a specific show room to receive live seat updates
        socket.on('join_show', (showId) => {
            socket.join(`show_${showId}`);
        });
        socket.on('leave_show', (showId) => {
            socket.leave(`show_${showId}`);
        });
    });
    return io;
};
exports.initSocketServer = initSocketServer;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized');
    }
    return io;
};
exports.getIO = getIO;
const emitSeatStatusUpdate = (showId, eventType, data) => {
    if (io) {
        io.to(`show_${showId}`).emit(`seat:${eventType}`, {
            showId,
            timestamp: new Date().toISOString(),
            ...data,
        });
    }
};
exports.emitSeatStatusUpdate = emitSeatStatusUpdate;
