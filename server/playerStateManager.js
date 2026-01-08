import {
  COLOR_PALETTE,
  GROUND_Y,
  MAX_PLAYERS,
  PLAYER_RADIUS,
  SPAWN_RADIUS,
  WORLD_SIZE,
} from '../shared/index.js';
import { createPlayerState } from '../shared/models.js';

function randomInRange(range) {
  return (Math.random() * 2 - 1) * range;
}

export default class PlayerStateManager {
  constructor() {
    this.players = new Map();
    this.nextId = 1;
  }

  createPlayer() {
    if (this.players.size >= MAX_PLAYERS) {
      throw new Error('Player limit reached.');
    }

    const id = this.nextId++;
    const color = COLOR_PALETTE[(id - 1) % COLOR_PALETTE.length];
    const position = {
      x: randomInRange(SPAWN_RADIUS),
      y: GROUND_Y,
      z: randomInRange(SPAWN_RADIUS),
    };

    const player = createPlayerState({
      id,
      color,
      position,
    });

    this.players.set(id, player);
    return player;
  }

  removePlayer(id) {
    return this.players.delete(id);
  }

  getPlayer(id) {
    return this.players.get(id);
  }

  listPlayers() {
    return Array.from(this.players.values());
  }

  clampToWorld(player) {
    const limit = WORLD_SIZE / 2 - PLAYER_RADIUS;
    player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
    player.position.z = Math.max(-limit, Math.min(limit, player.position.z));
    player.position.y = GROUND_Y;
  }
}
