import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const uploadsDir = path.join(root, 'uploads');

const samplePng = () =>
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7WfX0AAAAASUVORK5CYII=',
    'base64',
  );

test('backend smoke', async () => {
  process.env.NO_LISTEN = 'true';
  const { default: app } = await import('../app.js');

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // health
    {
      const res = await fetch(`${base}/api/health`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.status, 'healthy');
    }

    // protected must 401
    {
      const res = await fetch(`${base}/api/orders/myorders`);
      assert.equal(res.status, 401);
    }

    // categories/products (requires DB)
    {
      const res = await fetch(`${base}/api/categories?level=1`);
      assert.equal(res.status, 200);
    }
    {
      const res = await fetch(`${base}/api/products?limit=1`);
      assert.equal(res.status, 200);
    }

    // upload stores file
    {
      const form = new FormData();
      form.append('image', new Blob([samplePng()], { type: 'image/png' }), 'smoke.png');
      const res = await fetch(`${base}/api/upload`, { method: 'POST', body: form });
      assert.equal(res.status, 200);
      const body = (await res.text()).trim();
      assert.ok(body.includes('/uploads/'));
      const u = new URL(body);
      const filename = path.basename(u.pathname);
      await fs.stat(path.join(uploadsDir, filename));
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect().catch(() => {});
  }
});
