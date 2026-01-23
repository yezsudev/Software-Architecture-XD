// Simple Express server demonstrating slow DB call vs Redis-cached response
const express = require('express');
const redis = require('redis');

const app = express();
const PORT = 3000;

// Redis client (uses default localhost:6379)
const client = redis.createClient();
client.on('error', (err) => console.error('Redis Client Error', err));

async function startRedis() {
  await client.connect();
}

// Simulated slow DB function (~170ms)
function slowDbCall(key) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ key, value: `value-for-${key}`, ts: Date.now() });
    }, 170);
  });
}

app.get('/data/:key', async (req, res) => {
  const key = req.params.key;

  try {
    // Check Redis cache
    const cached = await client.get(key);
    if (cached) {
      // return cached JSON
      return res.json({ source: 'redis', data: JSON.parse(cached) });
    }

    // Simulate slow DB
    const data = await slowDbCall(key);

    // Save to Redis with TTL 60s
    await client.setEx(key, 60, JSON.stringify(data));

    return res.json({ source: 'db', data });
  } catch (err) {
    console.error(err);
    res.status(500).send('error');
  }
});

startRedis().then(() => {
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to connect redis', err);
});
