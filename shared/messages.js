export const MessageType = Object.freeze({
  JOIN: 'join',
  WELCOME: 'welcome',
  INPUT: 'input',
  SNAPSHOT: 'snapshot',
  LEAVE: 'leave',
  PING: 'ping',
  PONG: 'pong',
});

export function createMessage(type, payload) {
  return { type, payload };
}

export function encodeMessage(message) {
  return JSON.stringify(message);
}

export function decodeMessage(raw) {
  try {
    const text = typeof raw === 'string' ? raw : raw?.toString?.();
    if (!text) {
      return null;
    }
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed.type !== 'string') {
      return null;
    }
    return parsed;
  } catch (error) {
    return null;
  }
}
