import InputController from './input.js';
import NetworkClient from './networking.js';
import PlayerController from './playerController.js';
import Renderer from './renderer.js';

const statusEl = document.getElementById('status');
const renderer = new Renderer();
const input = new InputController({ element: renderer.domElement });

const network = new NetworkClient({
  onSnapshot: (snapshot) => controller.handleSnapshot(snapshot),
  onWelcome: (payload) => {
    controller.setPlayerId(payload.playerId);
    statusEl.textContent = `Connected · tick ${payload.tickRate} Hz`;
  },
  onStatus: (message) => {
    statusEl.textContent = message;
  },
});

const controller = new PlayerController({ network, input });
network.connect();

let lastTime = performance.now();
function animate(now) {
  const deltaSeconds = (now - lastTime) / 1000;
  lastTime = now;

  controller.update(deltaSeconds, now);
  renderer.update(Array.from(controller.players.values()), controller.playerId);
  renderer.render();

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
