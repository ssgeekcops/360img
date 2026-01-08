import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { MessageType } from '../shared/index.js';
import MultiplayerWebSocketServer from './websocketServer.js';
import PlayerStateManager from './playerStateManager.js';
import RoomManager from './roomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const sharedDir = path.join(rootDir, 'shared');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
};

async function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(urlPath).replace(/^\.\.(\/|\\)/, '');
  const filePath = safePath.startsWith('/shared')
    ? path.join(sharedDir, safePath.replace('/shared', ''))
    : path.join(clientDir, safePath);

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    });
    res.end(data);
  } catch (error) {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  if (req.url === '/ws') {
    res.writeHead(426);
    res.end('Upgrade Required');
    return;
  }
  serveStatic(req, res);
});

const transport = new MultiplayerWebSocketServer({ httpServer: server });
const playerManager = new PlayerStateManager();
const roomManager = new RoomManager({ transport, playerManager });

const clientToPlayer = new Map();

transport.on('connect', ({ clientId }) => {
  const player = roomManager.handleJoin(clientId);
  clientToPlayer.set(clientId, player.id);
});

transport.on('disconnect', ({ clientId }) => {
  const playerId = clientToPlayer.get(clientId);
  roomManager.handleLeave(clientId, playerId);
  clientToPlayer.delete(clientId);
});

transport.on('message', ({ clientId, message }) => {
  if (message.type === MessageType.INPUT) {
    roomManager.handleInput(clientId, message.payload);
  }
});

var SERVER_PORT = globalThis.__SERVER_PORT__ || Number(process.env.PORT) || 3000;
globalThis.__SERVER_PORT__ = SERVER_PORT;

if (!server.listening) {
  server.listen(SERVER_PORT, () => {
    roomManager.start();
    console.log(`Server listening on http://localhost:${SERVER_PORT}`);
  });
}
