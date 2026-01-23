// Simple client to measure timing of first request (DB) vs second (Redis cache)
const axios = require('axios');

async function measure(key) {
  const url = `http://localhost:3000/data/${key}`;

  const t0 = Date.now();
  const r1 = await axios.get(url);
  const t1 = Date.now();

  const r2Start = Date.now();
  const r2 = await axios.get(url);
  const r2End = Date.now();

  console.log('first status', r1.status, 'source', r1.data.source, 'time', (t1 - t0), 'ms');
  console.log('second status', r2.status, 'source', r2.data.source, 'time', (r2End - r2Start), 'ms');
}

measure('foo').catch(e => console.error(e.message));
