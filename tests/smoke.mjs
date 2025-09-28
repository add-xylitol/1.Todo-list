import https from 'https';
import http from 'http';

const BASE = process.env.SMOKE_BASE || 'https://12343cb8678901.lhr.life';
const TS = Date.now();
const EMAIL = `smoke-${TS}@example.com`;
const USERN = `smoke-${TS}`;
const PASS = 'Passw0rd!';
const TITLE = `Smoke Task ${TS}`;
const DESC = 'via tunnel';

function request(method, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE}${path}`);
    const payload = data ? JSON.stringify(data) : null;
    const opts = {
      method,
      hostname: url.hostname,
      path: url.pathname + (url.search || ''),
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      protocol: url.protocol,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers
      }
    };
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function log(label, value) { console.log(`SMOKE:: ${label}`, value); }

(async () => {
  try {
    log('Base', BASE);
    // Public endpoints
    for (const p of ['/', '/favicon.ico', '/socket.io/socket.io.js', '/healthz', '/readyz']) {
      const { status } = await request('GET', p);
      log(`GET ${p}`, status);
    }

    // Register
    const reg = await request('POST', '/api/auth/register', { email: EMAIL, password: PASS, username: USERN });
    log('Register status', reg.status);

    // Login
    const login = await request('POST', '/api/auth/login', { email: EMAIL, password: PASS });
    log('Login status', login.status);
    let token = '';
    try {
      const j = JSON.parse(login.body);
      token = j?.data?.token || j?.token || '';
    } catch (e) {}
    log('Token length', token.length);
    if (!token) throw new Error('Token parse failed');

    const auth = { Authorization: `Bearer ${token}` };

    // GET tasks
    const tasks1 = await request('GET', '/api/tasks', null, auth);
    log('Tasks list status', tasks1.status);
    log('Tasks sample', tasks1.body.slice(0, 200) + '...');

    // Create task
    const create = await request('POST', '/api/tasks', { title: TITLE, description: DESC }, auth);
    log('Task create status', create.status);

    // Verify
    const tasks2 = await request('GET', '/api/tasks', null, auth);
    const contains = tasks2.body.includes(TITLE);
    log('Tasks verify status', tasks2.status);
    log('Contains new title', contains);

    process.exit(0);
  } catch (e) {
    console.error('SMOKE:: Error', e.message);
    process.exit(1);
  }
})();