import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/tokens';
import { Role } from '@prisma/client';

interface OnlineUser {
  userId: string;
  role: Role;
  socketId: string;
}

const onlineUsers = new Map<string, OnlineUser>(); // socketId -> user
const userSockets = new Map<string, Set<string>>(); // userId -> set of socketIds

export function setupSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as { userId: string; role: Role; email: string };
    if (!user) {
      socket.disconnect();
      return;
    }

    onlineUsers.set(socket.id, { userId: user.userId, role: user.role, socketId: socket.id });
    if (!userSockets.has(user.userId)) {
      userSockets.set(user.userId, new Set());
    }
    userSockets.get(user.userId)!.add(socket.id);

    // Broadcast online count to admins
    io.emit('presence:update', { onlineCount: onlineUsers.size });

    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      const sockets = userSockets.get(user.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(user.userId);
      }
      io.emit('presence:update', { onlineCount: onlineUsers.size });
    });
  });
}

export function emitToProject(io: Server, projectId: string, event: string, data: unknown) {
  io.to(`project:${projectId}`).emit(event, data);
}

export function emitToUser(io: Server, userId: string, event: string, data: unknown) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit(event, data);
    }
  }
}

export function emitToRole(io: Server, roles: Role[], event: string, data: unknown) {
  for (const [, u] of onlineUsers) {
    if (roles.includes(u.role)) {
      io.to(u.socketId).emit(event, data);
    }
  }
}

export function getOnlineCount() {
  return onlineUsers.size;
}
