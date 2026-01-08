import {
  MessageType,
  createMessage,
  decodeMessage,
  encodeMessage,
} from '../shared/index.js';

const PING_INTERVAL_MS = 4000;

export default class NetworkClient {
  constructor({ onSnapshot, onWelcome, onStatus }) {
    this.socket = null;
    this.onSnapshot = onSnapshot;
    this.onWelcome = onWelcome;
    this.onStatus = onStatus;
    this.pingTimer = null;
  }

  connect() {
    const isSecure =
      window.location.protocol === 'https:' ||
      window.isSecureContext ||
      window.location.hostname.endsWith('.railway.app');
    const protocol = isSecure ? 'wss' : 'ws';
    const overrideUrl = window.__WS_URL__ || new URLSearchParams(window.location.search).get('ws');
    const wsUrl = overrideUrl || `${protocol}://${window.location.host}/ws`;
    this.socket = new WebSocket(wsUrl);

    this.socket.addEventListener('open', () => {
      this.onStatus?.('Connected');
      this.socket.send(encodeMessage(createMessage(MessageType.JOIN, {})));
      this.startPing();
    });

    this.socket.addEventListener('message', (event) => {
      const message = decodeMessage(event.data);
      if (!message) {
        return;
      }

      if (message.type === MessageType.WELCOME) {
        this.onWelcome?.(message.payload);
      } else if (message.type === MessageType.SNAPSHOT) {
        this.onSnapshot?.(message.payload);
      } else if (message.type === MessageType.PONG) {
        const latency = Date.now() - message.payload.time;
        this.onStatus?.(`Ping: ${latency}ms`);
      }
    });

    this.socket.addEventListener('close', () => {
      this.onStatus?.('Disconnected');
      this.stopPing();
    });

    this.socket.addEventListener('error', () => {
      this.onStatus?.('Connection error');
    });
  }

  sendInput(payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(encodeMessage(createMessage(MessageType.INPUT, payload)));
  }

  startPing() {
    if (this.pingTimer) {
      return;
    }
    this.pingTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(encodeMessage(createMessage(MessageType.PING, { time: Date.now() })));
      }
    }, PING_INTERVAL_MS);
  }

  stopPing() {
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}
