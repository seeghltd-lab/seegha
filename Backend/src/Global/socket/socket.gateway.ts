import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class AppSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  adminSockets = new Map<string, Set<string>>();
  employeeSockets = new Map<string, Set<string>>();

  handleConnection(socket: Socket) {
    console.log(`Socket connected: ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    console.log(`Socket disconnected: ${socket.id}`);
    this.removeSocketFromMaps(socket.id);
  }

  private removeSocketFromMaps(socketId: string) {
    this.adminSockets.forEach((set, adminId) => {
      if (set.delete(socketId) && set.size === 0) {
        this.adminSockets.delete(adminId);
      }
    });
    this.employeeSockets.forEach((set, employeeId) => {
      if (set.delete(socketId) && set.size === 0) {
        this.employeeSockets.delete(employeeId);
      }
    });
  }

  @SubscribeMessage('registerUser')
  registerUser(
    @MessageBody() data: { id: string; type: 'ADMIN' | 'EMPLOYEE' },
    @ConnectedSocket() socket: Socket,
  ) {
    if (!data?.id || !data?.type) return;

    if (data.type === 'ADMIN') {
      if (!this.adminSockets.has(data.id)) {
        this.adminSockets.set(data.id, new Set());
      }
      this.adminSockets.get(data.id)?.add(socket.id);
    }

    if (data.type === 'EMPLOYEE') {
      if (!this.employeeSockets.has(data.id)) {
        this.employeeSockets.set(data.id, new Set());
      }
      this.employeeSockets.get(data.id)?.add(socket.id);
    }

    return { success: true };
  }

  emitToAdmin(adminId: string, event: string, data: any) {
    const sockets = this.adminSockets.get(adminId);
    if (!sockets) return;
    sockets.forEach((socketId) => this.server.to(socketId).emit(event, data));
  }

  emitToEmployee(employeeId: string, event: string, data: any) {
    const sockets = this.employeeSockets.get(employeeId);
    if (!sockets) return;
    sockets.forEach((socketId) => this.server.to(socketId).emit(event, data));
  }

  emitToRecipients(
    recipients: { id: string; type: 'ADMIN' | 'EMPLOYEE' }[],
    event: string,
    data: any,
  ) {
    recipients.forEach((r) => {
      if (r.type === 'ADMIN') {
        this.emitToAdmin(r.id, event, data);
      } else {
        this.emitToEmployee(r.id, event, data);
      }
    });
  }

  emitToAllAdmins(event: string, data: any) {
    this.adminSockets.forEach((sockets) => {
      sockets.forEach((socketId) => this.server.to(socketId).emit(event, data));
    });
  }

  emitToAllEmployees(event: string, data: any) {
    this.employeeSockets.forEach((sockets) => {
      sockets.forEach((socketId) => this.server.to(socketId).emit(event, data));
    });
  }
}
