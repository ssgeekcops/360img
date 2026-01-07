const MessageType = Object.freeze({
  JOIN: 'join',
  LEAVE: 'leave',
  INPUT: 'input',
  SNAPSHOT: 'snapshot',
});

const MessageSchemas = Object.freeze({
  [MessageType.JOIN]: {
    type: MessageType.JOIN,
    payload: {
      clientId: 'string',
    },
  },
  [MessageType.LEAVE]: {
    type: MessageType.LEAVE,
    payload: {
      clientId: 'string',
    },
  },
  [MessageType.INPUT]: {
    type: MessageType.INPUT,
    payload: {
      clientId: 'string',
      entityId: 'number',
      sequence: 'number',
      input: 'object',
    },
  },
  [MessageType.SNAPSHOT]: {
    type: MessageType.SNAPSHOT,
    payload: {
      tick: 'number',
      entities: 'object',
      lastProcessedInput: 'number',
    },
  },
});

function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    return { valid: false, error: 'Message must be an object.' };
  }

  const schema = MessageSchemas[message.type];
  if (!schema) {
    return { valid: false, error: `Unknown message type: ${message.type}` };
  }

  const payload = message.payload || {};
  const schemaPayload = schema.payload || {};

  for (const [key, expectedType] of Object.entries(schemaPayload)) {
    if (typeof payload[key] !== expectedType) {
      return {
        valid: false,
        error: `Invalid payload.${key}; expected ${expectedType}.`,
      };
    }
  }

  return { valid: true };
}

function createMessage(type, payload) {
  return { type, payload };
}

module.exports = {
  MessageType,
  MessageSchemas,
  validateMessage,
  createMessage,
};
