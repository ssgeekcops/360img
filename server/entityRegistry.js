const { MAX_ENTITIES } = require('../shared');

class EntityRegistry {
  constructor() {
    this.nextId = 1;
    this.entities = new Map();
  }

  createEntity(data = {}) {
    if (this.entities.size >= MAX_ENTITIES) {
      throw new Error('Entity limit reached.');
    }

    const id = this.nextId++;
    const entity = {
      id,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      ...data,
    };

    this.entities.set(id, entity);
    return entity;
  }

  removeEntity(id) {
    return this.entities.delete(id);
  }

  getEntity(id) {
    return this.entities.get(id);
  }

  listEntities() {
    return Array.from(this.entities.values());
  }
}

module.exports = EntityRegistry;
