const {
  TICK_INTERVAL_MS,
  MessageType,
  createMessage,
} = require('../shared');
const EntityRegistry = require('./entityRegistry');
const WorldState = require('./worldState');

class SimulationServer {
  constructor(transport) {
    this.transport = transport;
    this.registry = new EntityRegistry();
    this.world = new WorldState();
    this.pendingInputs = [];
    this.timer = null;
  }

  start() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  handleMessage(message) {
    if (message.type === MessageType.INPUT) {
      this.pendingInputs.push(message.payload);
    }
  }

  tick() {
    this.world.advanceTick();
    const lastProcessedInput = this.processInputs();
    this.simulateEntities();

    const snapshot = this.world.recordSnapshot(
      this.registry.listEntities(),
      lastProcessedInput
    );
    this.broadcastSnapshot(snapshot);
  }

  processInputs() {
    let lastProcessedInput = 0;
    for (const input of this.pendingInputs) {
      const entity = this.registry.getEntity(input.entityId);
      if (!entity) {
        continue;
      }

      const { moveX = 0, moveY = 0 } = input.input || {};
      entity.velocity.x = moveX;
      entity.velocity.y = moveY;
      lastProcessedInput = Math.max(lastProcessedInput, input.sequence);
    }

    this.pendingInputs = [];
    return lastProcessedInput;
  }

  simulateEntities() {
    for (const entity of this.registry.listEntities()) {
      entity.position.x += entity.velocity.x;
      entity.position.y += entity.velocity.y;
    }
  }

  broadcastSnapshot(snapshot) {
    const message = createMessage(MessageType.SNAPSHOT, snapshot);
    this.transport.broadcast(message);
  }
}

module.exports = SimulationServer;
