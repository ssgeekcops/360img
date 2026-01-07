class Renderer {
  constructor(target) {
    this.target = target;
  }

  render(state) {
    if (!this.target) {
      return;
    }

    const content = `Position: (${state.position.x.toFixed(2)}, ${state.position.y.toFixed(2)})`;
    this.target.textContent = content;
  }
}

module.exports = Renderer;
