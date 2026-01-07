# 360° Multiplayer World Prototype

This repository contains a minimal 360° first-person multiplayer world built with Three.js on the client and a WebSocket-authoritative Node.js server.

## How to run locally

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open the client in your browser:

```
http://localhost:3000
```

Open multiple tabs/windows to see other players.

## Architecture overview

### Client (`/client`)
- `renderer.js` creates the Three.js scene, ground, skybox, camera, and avatar meshes.
- `input.js` captures keyboard, mouse (pointer lock), and touch input.
- `networking.js` manages the WebSocket connection, ping logging, and message dispatch.
- `playerController.js` tracks local/remote players, applies look input, and smooths remote players via interpolation.
- `main.js` wires everything together with the animation loop.

### Server (`/server`)
- `websocketServer.js` implements the WebSocket handshake and abstracts client connect/message/broadcast flows.
- `playerStateManager.js` owns player lifecycle (spawn, clamp, removal).
- `roomManager.js` runs the authoritative tick, validates input, updates positions, and broadcasts snapshots.
- `index.js` hosts HTTP + WebSocket endpoints and serves static assets.

### Shared (`/shared`)
- `constants.js` keeps tunable configuration values (tick rate, movement speed, world size).
- `messages.js` defines the WebSocket message protocol and helpers.
- `models.js` contains data shape helpers for player state.

## Multiplayer details

- Clients send movement + look input at a fixed rate.
- The server validates inputs, clamps movement, and updates authoritative positions every tick.
- The server broadcasts snapshot states to all clients.
- Clients interpolate remote player positions using a small interpolation delay for smooth movement.

## Next extension ideas

- Add chat messages and player nameplates.
- Integrate physics for collisions and jumping.
- Attach voice channels per room.
- Stream asset bundles (models, textures, animation rigs).
