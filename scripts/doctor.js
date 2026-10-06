import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const result = (ok, name, details = '') => ({ ok, name, details });

dotenv.config();

const readEnvFile = async (envPath) => {
  try {
    const raw = await fs.readFile(envPath, 'utf8');
    return raw;
  } catch {
    return '';
  }
};

const samplePng = () =>
  Buffer.from(
    // 1x1 transparent PNG
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7WfX0AAAAASUVORK5CYII=',
    'base64',
  );

const httpJson = async (url, init) => {
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { res, text, json };
};

const main = async () => {
  const checks = [];

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const root = path.resolve(__dirname, '..');
  const envPath = path.join(root, '.env');
  const uploadsDir = path.join(root, 'uploads');

  const rawEnv = await readEnvFile(envPath);
  if (rawEnv && rawEnv.includes('NODE_ENV=') && rawEnv.includes('#') && rawEnv.includes('NODE_ENV=development#')) {
    checks.push(
      result(
        false,
        'backend/.env formatting',
        'Found `NODE_ENV=development#...` (missing newline). Fix `.env` line breaks.',
      ),
    );
  } else {
    checks.push(result(true, 'backend/.env formatting'));
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  checks.push(
    result(Boolean(mongoUri), 'MongoDB env', 'Set `MONGODB_URI` (or `MONGO_URI`) in backend/.env'),
  );
  checks.push(
    result(Boolean(process.env.BASE_URL), 'BASE_URL env', 'Set `BASE_URL` in backend/.env'),
  );

  // Start express app without auto-listen.
  process.env.NO_LISTEN = 'true';
  const { default: app } = await import('../app.js');

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });

  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  // Health
  try {
    const { res, json } = await httpJson(`${base}/api/health`);
    checks.push(
      result(res.status === 200 && json?.status === 'healthy', 'GET /api/health', `HTTP ${res.status}`),
    );
  } catch (e) {
    checks.push(result(false, 'GET /api/health', e.message));
  }

  // Protected route must be 401 without token
  try {
    const { res } = await httpJson(`${base}/api/orders/myorders`);
    checks.push(result(res.status === 401, 'GET /api/orders/myorders (no token)', `HTTP ${res.status}`));
  } catch (e) {
    checks.push(result(false, 'GET /api/orders/myorders (no token)', e.message));
  }

  // Categories
  try {
    const { res } = await httpJson(`${base}/api/categories?level=1`);
    checks.push(result(res.status === 200, 'GET /api/categories?level=1', `HTTP ${res.status}`));
  } catch (e) {
    checks.push(result(false, 'GET /api/categories?level=1', e.message));
  }

  // Products
  try {
    const { res } = await httpJson(`${base}/api/products?limit=1`);
    checks.push(result(res.status === 200, 'GET /api/products?limit=1', `HTTP ${res.status}`));
  } catch (e) {
    checks.push(result(false, 'GET /api/products?limit=1', e.message));
  }

  // Upload
  try {
    const form = new FormData();
    form.append('image', new Blob([samplePng()], { type: 'image/png' }), 'doctor.png');

    const res = await fetch(`${base}/api/upload`, { method: 'POST', body: form });
    const body = await res.text();
    const ok = res.status === 200 && body.includes('/uploads/');

    let fileExists = false;
    try {
      const u = new URL(body.trim());
      const filename = path.basename(u.pathname);
      await fs.stat(path.join(uploadsDir, filename));
      fileExists = true;
    } catch {
      // ignore
    }

    checks.push(
      result(ok && fileExists, 'POST /api/upload (stores file)', `HTTP ${res.status}, body: ${body.trim()}`),
    );
  } catch (e) {
    checks.push(result(false, 'POST /api/upload (stores file)', e.message));
  }

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect().catch(() => {});

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    const status = c.ok ? 'PASS' : 'FAIL';
    console.log(`${status} - ${c.name}${c.details ? ` - ${c.details}` : ''}`);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

main().catch((e) => {
  console.error('Doctor failed:', e);
  process.exit(1);
});
