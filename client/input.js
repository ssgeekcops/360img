class InputCapture {
  constructor() {
    this.sequence = 0;
    this.queue = [];
  }

  capture(input) {
    const payload = {
      sequence: this.sequence++,
      input,
    };
    this.queue.push(payload);
    return payload;
  }

  drain() {
    const queued = this.queue;
    this.queue = [];
    return queued;
  }
}

module.exports = InputCapture;
