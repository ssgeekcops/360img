const { MessageType, createMessage } = require('../shared');

class PredictionClient {
  constructor(transport, entityId) {
    this.transport = transport;
    this.entityId = entityId;
    this.localState = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
    };
    this.pendingInputs = [];
    this.latestServerTick = 0;
  }

  applyInput(input) {
    this.pendingInputs.push(input);
    const payload = {
      clientId: this.transport.clientId,
      entityId: this.entityId,
      sequence: input.sequence,
      input: input.input,
    };

    this.transport.send(createMessage(MessageType.INPUT, payload));
    this.simulate(input.input);
  }

  handleSnapshot(snapshot) {
    this.latestServerTick = snapshot.tick;
    const entity = snapshot.entities.find((entry) => entry.id === this.entityId);
    if (!entity) {
      return;
    }

    this.localState.position = { ...entity.position };
    this.localState.velocity = { ...entity.velocity };

    this.pendingInputs = this.pendingInputs.filter(
      (input) => input.sequence > snapshot.lastProcessedInput
    );

    for (const input of this.pendingInputs) {
      this.simulate(input.input);
    }
  }

  simulate(input) {
    const { moveX = 0, moveY = 0 } = input || {};
    this.localState.velocity.x = moveX;
    this.localState.velocity.y = moveY;
    this.localState.position.x += moveX;
    this.localState.position.y += moveY;
  }
}

module.exports = PredictionClient;
