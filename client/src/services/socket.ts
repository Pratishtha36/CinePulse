import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });


  }
  return socket;
};

export const joinShowRoom = (showId: string) => {
  const s = getSocket();
  s.emit('join_show', showId);
};

export const leaveShowRoom = (showId: string) => {
  const s = getSocket();
  s.emit('leave_show', showId);
};
