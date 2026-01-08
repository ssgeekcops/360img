import {
  INPUT_SEND_RATE,
  INTERPOLATION_DELAY_MS,
  MAX_PITCH,
} from '../shared/index.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpVector3(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

function lerpRotation(a, b, t) {
  return {
    yaw: lerp(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
  };
}

export default class PlayerController {
  constructor({ network, input }) {
    this.network = network;
    this.input = input;
    this.playerId = null;
    this.players = new Map();
    this.snapshots = [];
    this.sequence = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.lastSentTime = 0;
  }

  setPlayerId(id) {
    this.playerId = id;
  }

  handleSnapshot(snapshot) {
    const timestamp = performance.now();
    this.snapshots.push({
      time: timestamp,
      data: snapshot,
    });

    while (this.snapshots.length > 40) {
      this.snapshots.shift();
    }

    for (const player of snapshot.players) {
      const existing = this.players.get(player.id) || {};
      this.players.set(player.id, {
        ...existing,
        ...player,
      });
    }
  }

  update(deltaSeconds, now) {
    if (!this.playerId) {
      return;
    }

    const lookDelta = this.input.consumeLookDelta();
    this.yaw += lookDelta.x;
    this.pitch = clamp(this.pitch - lookDelta.y, -MAX_PITCH, MAX_PITCH);

    const move = this.input.getMoveVector();
    this.maybeSendInput(move, now);

    const localPlayer = this.players.get(this.playerId);
    if (localPlayer) {
      localPlayer.rotation = { yaw: this.yaw, pitch: this.pitch };
    }

    this.applyInterpolation(now);
  }

  maybeSendInput(move, now) {
    const sendInterval = 1000 / INPUT_SEND_RATE;
    if (now - this.lastSentTime < sendInterval) {
      return;
    }

    this.lastSentTime = now;
    this.sequence += 1;
    this.network.sendInput({
      playerId: this.playerId,
      sequence: this.sequence,
      input: {
        moveX: move.moveX,
        moveZ: move.moveZ,
        yaw: this.yaw,
        pitch: this.pitch,
      },
    });
  }

  applyInterpolation(now) {
    const renderTime = now - INTERPOLATION_DELAY_MS;
    if (this.snapshots.length < 2) {
      return;
    }

    let older = null;
    let newer = null;
    for (let i = this.snapshots.length - 1; i >= 0; i -= 1) {
      const snapshot = this.snapshots[i];
      if (snapshot.time <= renderTime) {
        older = snapshot;
        newer = this.snapshots[i + 1] || snapshot;
        break;
      }
    }

    if (!older || !newer) {
      return;
    }

    const span = newer.time - older.time || 1;
    const t = clamp((renderTime - older.time) / span, 0, 1);

    // Interpolate remote players between two snapshots to keep motion smooth.
    for (const player of older.data.players) {
      const newerPlayer = newer.data.players.find((entry) => entry.id === player.id) || player;
      const interpolated = {
        id: player.id,
        color: player.color,
        position: lerpVector3(player.position, newerPlayer.position, t),
        rotation: lerpRotation(player.rotation, newerPlayer.rotation, t),
      };
      const existing = this.players.get(player.id) || {};
      this.players.set(player.id, { ...existing, ...interpolated });
    }
  }
}
