const InputCapture = require('./input');
const PredictionClient = require('./prediction');
const Renderer = require('./renderer');

class GameClient {
  constructor(transport, entityId, renderTarget) {
    this.transport = transport;
    this.input = new InputCapture();
    this.prediction = new PredictionClient(transport, entityId);
    this.renderer = new Renderer(renderTarget);
  }

  captureAndSend(input) {
    const payload = this.input.capture(input);
    this.prediction.applyInput(payload);
  }

  handleSnapshot(snapshot) {
    this.prediction.handleSnapshot(snapshot);
  }

  render() {
    this.renderer.render(this.prediction.localState);
  }
}

module.exports = {
  GameClient,
};
