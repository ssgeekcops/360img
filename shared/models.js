import { GROUND_Y } from './constants.js';

export function createPlayerState({ id, color, position, rotation }) {
  return {
    id,
    color,
    position: position || { x: 0, y: GROUND_Y, z: 0 },
    rotation: rotation || { yaw: 0, pitch: 0 },
    velocity: { x: 0, z: 0 },
    lastInputSequence: 0,
  };
}
