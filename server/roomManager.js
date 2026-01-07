import {
  INTERPOLATION_DELAY_MS,
  MessageType,
  PLAYER_SPEED,
  TICK_INTERVAL_MS,
  TICK_RATE,
  MAX_PITCH,
} from '../shared/index.js';
import { createMessage } from '../shared/messages.js';

function normalizeVector(x, z) {
  const length = Math.hypot(x, z);
  if (length === 0) {
    return { x: 0, z: 0 };
  }
  const scale = Math.min(1, 1 / length);
  return { x: x * scale, z: z * scale };
}

export default class RoomManager {
  constructor({ transport, playerManager }) {
    this.transport = transport;
    this.playerManager = playerManager;
    this.pendingInputs = new Map();
    this.tickTimer = null;
    this.tick = 0;
  }

  start() {
    if (this.tickTimer) {
      return;
    }
    this.tickTimer = setInterval(() => this.tickWorld(), TICK_INTERVAL_MS);
  }

  stop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  handleJoin(clientId) {
    const player = this.playerManager.createPlayer();
    this.transport.sendTo(
      clientId,
      createMessage(MessageType.WELCOME, {
        playerId: player.id,
        tickRate: TICK_RATE,
        interpolationDelay: INTERPOLATION_DELAY_MS,
      })
    );

    this.broadcastSnapshot();
    return player;
  }

  handleInput(clientId, payload) {
    const player = this.playerManager.getPlayer(payload.playerId);
    if (!player) {
      return;
    }

    this.pendingInputs.set(player.id, {
      input: payload.input,
      sequence: payload.sequence,
    });
  }

  handleLeave(clientId, playerId) {
    if (playerId) {
      this.playerManager.removePlayer(playerId);
    }
    this.transport.sendTo(
      clientId,
      createMessage(MessageType.LEAVE, { playerId })
    );
    this.broadcastSnapshot();
  }

  tickWorld() {
    this.tick += 1;
    const dt = 1 / TICK_RATE;

    for (const player of this.playerManager.listPlayers()) {
      // Apply the most recent input per player and keep the server authoritative.
      const pending = this.pendingInputs.get(player.id);
      if (pending) {
        player.lastInputSequence = pending.sequence;
        const input = pending.input || {};
        const normalized = normalizeVector(input.moveX || 0, input.moveZ || 0);

        player.velocity.x = normalized.x * PLAYER_SPEED;
        player.velocity.z = normalized.z * PLAYER_SPEED;

        player.rotation.yaw = input.yaw ?? player.rotation.yaw;
        if (typeof input.pitch === 'number') {
          player.rotation.pitch = Math.max(
            -MAX_PITCH,
            Math.min(MAX_PITCH, input.pitch)
          );
        }
      }

      player.position.x += player.velocity.x * dt;
      player.position.z += player.velocity.z * dt;
      this.playerManager.clampToWorld(player);
    }

    this.pendingInputs.clear();
    // Broadcast the world snapshot at a fixed tick rate for interpolation on clients.
    this.broadcastSnapshot();
  }

  broadcastSnapshot() {
    const snapshot = {
      tick: this.tick,
      players: this.playerManager.listPlayers().map((player) => ({
        id: player.id,
        color: player.color,
        position: { ...player.position },
        rotation: { ...player.rotation },
        lastInputSequence: player.lastInputSequence,
      })),
    };

    this.transport.broadcast(createMessage(MessageType.SNAPSHOT, snapshot));
  }
}
