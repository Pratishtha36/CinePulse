import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export const initSocketServer = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    // Client joins a specific show room to receive live seat updates
    socket.on('join_show', (showId: string) => {
      socket.join(`show_${showId}`);
    });

    socket.on('leave_show', (showId: string) => {
      socket.leave(`show_${showId}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

export const emitSeatStatusUpdate = (showId: string, eventType: 'held' | 'released' | 'booked', data: any) => {
  if (io) {
    io.to(`show_${showId}`).emit(`seat:${eventType}`, {
      showId,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
};
