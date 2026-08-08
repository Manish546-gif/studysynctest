const TARGET = process.env.KEEP_ALIVE_URL || 'https://studysynctest.onrender.com';
const INTERVAL_MS = (Number(process.env.KEEP_ALIVE_INTERVAL_MINUTES) || 10) * 60 * 1000;

async function ping() {
  const started = Date.now();
  try {
    const res = await fetch(TARGET, { method: 'GET', signal: AbortSignal.timeout(30000) });
    console.log(
      `[${new Date().toISOString()}] ${res.status} ${res.statusText} (${Date.now() - started}ms) ${TARGET}`
    );
  } catch (err) {
    console.log(`[${new Date().toISOString()}] FAILED: ${err.message} (${Date.now() - started}ms)`);
  }
}

async function run() {
  await ping();
  setInterval(ping, INTERVAL_MS);
  console.log(`Keep-alive started. Pinging ${TARGET} every ${INTERVAL_MS / 60000} min.`);
}

run();
