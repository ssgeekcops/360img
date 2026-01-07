const { SNAPSHOT_HISTORY_SIZE } = require('../shared');

class WorldState {
  constructor() {
    this.tick = 0;
    this.snapshots = [];
  }

  advanceTick() {
    this.tick += 1;
  }

  recordSnapshot(entities, lastProcessedInput = 0) {
    const snapshot = {
      tick: this.tick,
      entities: entities.map((entity) => ({
        id: entity.id,
        position: { ...entity.position },
        velocity: { ...entity.velocity },
      })),
      lastProcessedInput,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > SNAPSHOT_HISTORY_SIZE) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  getLatestSnapshot() {
    return this.snapshots[this.snapshots.length - 1] || null;
  }
}

module.exports = WorldState;
