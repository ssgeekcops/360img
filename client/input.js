import { LOOK_SENSITIVITY } from '../shared/index.js';

const TOUCH_DEADZONE = 6;
const TOUCH_MAX_DISTANCE = 80;

export default class InputController {
  constructor({ element }) {
    this.element = element;
    this.keys = new Set();
    this.pointerLocked = false;
    this.lookDelta = { x: 0, y: 0 };
    this.touchState = {
      movement: null,
      look: null,
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    this.attach();
  }

  attach() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd);
    window.addEventListener('touchcancel', this.handleTouchEnd);

    if (this.element) {
      this.element.addEventListener('click', () => {
        this.element.requestPointerLock();
      });
    }
  }

  handlePointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this.element;
  }

  handleKeyDown(event) {
    this.keys.add(event.code);
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  handleMouseMove(event) {
    if (!this.pointerLocked) {
      return;
    }
    this.lookDelta.x += event.movementX * LOOK_SENSITIVITY;
    this.lookDelta.y += event.movementY * LOOK_SENSITIVITY;
  }

  handleTouchStart(event) {
    if (!event.touches.length) {
      return;
    }

    for (const touch of event.changedTouches) {
      const targetState = touch.clientX < window.innerWidth / 2
        ? 'movement'
        : 'look';
      if (!this.touchState[targetState]) {
        this.touchState[targetState] = {
          id: touch.identifier,
          startX: touch.clientX,
          startY: touch.clientY,
          currentX: touch.clientX,
          currentY: touch.clientY,
        };
      }
    }
  }

  handleTouchMove(event) {
    for (const touch of event.changedTouches) {
      for (const key of ['movement', 'look']) {
        const state = this.touchState[key];
        if (state && state.id === touch.identifier) {
          state.currentX = touch.clientX;
          state.currentY = touch.clientY;
        }
      }
    }
  }

  handleTouchEnd(event) {
    for (const touch of event.changedTouches) {
      for (const key of ['movement', 'look']) {
        const state = this.touchState[key];
        if (state && state.id === touch.identifier) {
          this.touchState[key] = null;
        }
      }
    }
  }

  consumeLookDelta() {
    const delta = { ...this.lookDelta };
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;

    const lookTouch = this.touchState.look;
    if (lookTouch) {
      const dx = lookTouch.currentX - lookTouch.startX;
      const dy = lookTouch.currentY - lookTouch.startY;
      lookTouch.startX = lookTouch.currentX;
      lookTouch.startY = lookTouch.currentY;
      delta.x += dx * LOOK_SENSITIVITY;
      delta.y += dy * LOOK_SENSITIVITY;
    }

    return delta;
  }

  getMoveVector() {
    let moveX = 0;
    let moveZ = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      moveZ -= 1;
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      moveZ += 1;
    }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      moveX -= 1;
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      moveX += 1;
    }

    const movementTouch = this.touchState.movement;
    if (movementTouch) {
      const dx = movementTouch.currentX - movementTouch.startX;
      const dy = movementTouch.currentY - movementTouch.startY;
      if (Math.hypot(dx, dy) > TOUCH_DEADZONE) {
        const clampedX = Math.max(-TOUCH_MAX_DISTANCE, Math.min(TOUCH_MAX_DISTANCE, dx));
        const clampedY = Math.max(-TOUCH_MAX_DISTANCE, Math.min(TOUCH_MAX_DISTANCE, dy));
        moveX += clampedX / TOUCH_MAX_DISTANCE;
        moveZ += clampedY / TOUCH_MAX_DISTANCE;
      }
    }

    const length = Math.hypot(moveX, moveZ);
    if (length > 1) {
      moveX /= length;
      moveZ /= length;
    }

    return { moveX, moveZ };
  }
}
