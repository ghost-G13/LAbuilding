const memoryStore = {};

const set = async (key, value, ttl) => {
  memoryStore[key] = {
    value,
    expiresAt: Date.now() + ttl * 1000,
  };
};

const get = async (key) => {
  const item = memoryStore[key];
  if (item && item.expiresAt > Date.now()) {
    return item.value;
  }
  delete memoryStore[key];
  return null;
};

const del = async (key) => {
  delete memoryStore[key];
};

module.exports = {
  set,
  get,
  del,
};