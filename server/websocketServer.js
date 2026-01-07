import crypto from 'crypto';
import { decodeMessage, encodeMessage, MessageType } from '../shared/index.js';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OPCODE_TEXT = 0x1;
const OPCODE_CLOSE = 0x8;

function createAcceptKey(key) {
  return crypto.createHash('sha1').update(`${key}${WS_GUID}`).digest('base64');
}

function encodeFrame(data) {
  const payload = Buffer.from(data);
  const length = payload.length;
  let header = null;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  header[0] = 0x80 | OPCODE_TEXT;
  return Buffer.concat([header, payload]);
}

function decodeFrames(buffer) {
  const messages = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const firstByte = buffer[offset];
    const secondByte = buffer[offset + 1];
    const opcode = firstByte & 0x0f;
    const masked = Boolean(secondByte & 0x80);
    let payloadLength = secondByte & 0x7f;
    let headerLength = 2;

    if (payloadLength === 126) {
      if (offset + 4 > buffer.length) {
        break;
      }
      payloadLength = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (payloadLength === 127) {
      if (offset + 10 > buffer.length) {
        break;
      }
      payloadLength = Number(buffer.readBigUInt64BE(offset + 2));
      headerLength = 10;
    }

    const maskOffset = headerLength;
    const dataOffset = headerLength + (masked ? 4 : 0);
    if (offset + dataOffset + payloadLength > buffer.length) {
      break;
    }

    const payload = buffer.slice(offset + dataOffset, offset + dataOffset + payloadLength);
    if (masked) {
      const mask = buffer.slice(offset + maskOffset, offset + maskOffset + 4);
      for (let i = 0; i < payload.length; i += 1) {
        payload[i] ^= mask[i % 4];
      }
    }

    if (opcode === OPCODE_CLOSE) {
      messages.push({ type: 'close' });
    } else if (opcode === OPCODE_TEXT) {
      messages.push({ type: 'text', data: payload.toString('utf8') });
    }

    offset += dataOffset + payloadLength;
  }

  return { messages, remaining: buffer.slice(offset) };
}

export default class MultiplayerWebSocketServer {
  constructor({ httpServer }) {
    this.clients = new Map();
    this.handlers = {};

    httpServer.on('upgrade', (req, socket) => {
      if (req.url !== '/ws') {
        socket.destroy();
        return;
      }

      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.destroy();
        return;
      }

      const acceptKey = createAcceptKey(key);
      socket.write(
        [
          'HTTP/1.1 101 Switching Protocols',
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Accept: ${acceptKey}`,
          '\r\n',
        ].join('\r\n')
      );

      const clientId = crypto.randomUUID();
      this.clients.set(clientId, { socket, buffer: Buffer.alloc(0) });

      socket.on('data', (data) => {
        const client = this.clients.get(clientId);
        if (!client) {
          return;
        }
        client.buffer = Buffer.concat([client.buffer, data]);
        const decoded = decodeFrames(client.buffer);
        client.buffer = decoded.remaining;

        for (const message of decoded.messages) {
          if (message.type === 'close') {
            socket.end();
            return;
          }
          if (message.type === 'text') {
            const parsed = decodeMessage(message.data);
            if (parsed) {
              this.handleMessage(clientId, parsed);
            }
          }
        }
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
    const encoded = encodeFrame(encodeMessage(message));
    for (const client of this.clients.values()) {
      client.socket.write(encoded);
    }
  }

  sendTo(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }
    client.socket.write(encodeFrame(encodeMessage(message)));
  }
}
