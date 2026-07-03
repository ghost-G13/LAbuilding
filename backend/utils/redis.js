let kvClient = null;

try {
  if (process.env.VERCEL_KV_REST_API_URL) {
    const { createClient } = require('@vercel/kv');
    kvClient = createClient({
      url: process.env.VERCEL_KV_REST_API_URL,
      token: process.env.VERCEL_KV_REST_API_TOKEN,
    });
    console.log('[Redis] Using Vercel KV');
  }
} catch (e) {
  console.log('[Redis] Vercel KV not available, using memory store');
}

const memoryStore = {};

const set = async (key, value, ttl) => {
  if (kvClient) {
    try {
      await kvClient.set(key, value, { ex: ttl });
      return;
    } catch (e) {
      console.error('[Redis] KV set error:', e);
    }
  }
  memoryStore[key] = {
    value,
    expiresAt: Date.now() + ttl * 1000,
  };
};

const get = async (key) => {
  if (kvClient) {
    try {
      const result = await kvClient.get(key);
      return result;
    } catch (e) {
      console.error('[Redis] KV get error:', e);
    }
  }
  const item = memoryStore[key];
  if (item && item.expiresAt > Date.now()) {
    return item.value;
  }
  delete memoryStore[key];
  return null;
};

const del = async (key) => {
  if (kvClient) {
    try {
      await kvClient.del(key);
      return;
    } catch (e) {
      console.error('[Redis] KV del error:', e);
    }
  }
  delete memoryStore[key];
};

module.exports = {
  set,
  get,
  del,
};