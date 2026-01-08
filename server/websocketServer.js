import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { decodeMessage, encodeMessage, MessageType } from '../shared/index.js';

export default class MultiplayerWebSocketServer {
  constructor({ httpServer }) {
    this.clients = new Map();
    this.handlers = {};

    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    this.wss.on('connection', (socket) => {
      const clientId = crypto.randomUUID();
      this.clients.set(clientId, socket);

      socket.on('message', (data) => {
        const message = decodeMessage(data);
        if (!message) {
          return;
        }
        this.handleMessage(clientId, message);
      });

      socket.on('close', () => {
        this.clients.delete(clientId);
        this.emit('disconnect', { clientId });
      });

      socket.on('error', () => {
        this.clients.delete(clientId);
        this.emit('disconnect', { clientId });
      });

      this.emit('connect', { clientId });
    });
  }

  on(event, handler) {
    this.handlers[event] = handler;
  }

  emit(event, payload) {
    const handler = this.handlers[event];
    if (handler) {
      handler(payload);
    }
  }

  handleMessage(clientId, message) {
    if (message.type === MessageType.PING) {
      this.sendTo(clientId, { type: MessageType.PONG, payload: { time: Date.now() } });
      return;
    }
    this.emit('message', { clientId, message });
  }

  broadcast(message) {
    const encoded = encodeMessage(message);
    for (const socket of this.clients.values()) {
      if (socket.readyState === socket.OPEN) {
        socket.send(encoded);
      }
    }
  }

  sendTo(clientId, message) {
    const socket = this.clients.get(clientId);
    if (!socket || socket.readyState !== socket.OPEN) {
      return;
    }
    socket.send(encodeMessage(message));
  }
}
