import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import {
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  WORLD_SIZE,
  GROUND_Y,
} from '../shared/index.js';

const CAMERA_FOV = 75;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 500;
const GROUND_COLOR = 0x1f2a3a;
const SKY_COLOR = 0x0b1020;
const AMBIENT_INTENSITY = 0.6;
const DIRECTIONAL_INTENSITY = 0.7;

export default class Renderer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CAMERA_NEAR,
      CAMERA_FAR
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.avatarMeshes = new Map();

    this.setupEnvironment();
    window.addEventListener('resize', () => this.handleResize());
  }

  setupEnvironment() {
    const groundGeometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: GROUND_COLOR });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    this.scene.add(ground);

    const skyGeometry = new THREE.BoxGeometry(WORLD_SIZE * 4, WORLD_SIZE * 4, WORLD_SIZE * 4);
    const skyMaterial = new THREE.MeshBasicMaterial({ color: SKY_COLOR, side: THREE.BackSide });
    const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(skybox);

    const ambient = new THREE.AmbientLight(0xffffff, AMBIENT_INTENSITY);
    this.scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, DIRECTIONAL_INTENSITY);
    directional.position.set(10, 20, 5);
    this.scene.add(directional);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  ensureAvatar(player) {
    if (this.avatarMeshes.has(player.id)) {
      return this.avatarMeshes.get(player.id);
    }

    const geometry = new THREE.CapsuleGeometry(PLAYER_RADIUS, PLAYER_HEIGHT - PLAYER_RADIUS * 2, 6, 12);
    const material = new THREE.MeshStandardMaterial({ color: player.color || '#ffffff' });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    this.avatarMeshes.set(player.id, mesh);
    return mesh;
  }

  update(players, localPlayerId) {
    const activeIds = new Set();
    for (const player of players) {
      activeIds.add(player.id);
      if (player.id === localPlayerId) {
        continue;
      }
      const mesh = this.ensureAvatar(player);
      mesh.position.set(player.position.x, player.position.y + PLAYER_HEIGHT / 2, player.position.z);
      mesh.rotation.y = player.rotation.yaw;
    }

    for (const [id, mesh] of this.avatarMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.avatarMeshes.delete(id);
      }
    }

    const localPlayer = players.find((player) => player.id === localPlayerId);
    if (localPlayer) {
      this.camera.position.set(
        localPlayer.position.x,
        localPlayer.position.y + PLAYER_HEIGHT,
        localPlayer.position.z
      );
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = localPlayer.rotation.yaw;
      this.camera.rotation.x = localPlayer.rotation.pitch;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  get domElement() {
    return this.renderer.domElement;
  }
}
