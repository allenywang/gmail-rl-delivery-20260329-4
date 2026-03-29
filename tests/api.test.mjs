import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.mjs';

let server;
let baseUrl;

test.before(async () => {
  server = await startServer(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4010;
  baseUrl = `http://127.0.0.1:${port}`;
  await request('/api/reset', { method: 'POST' });
});

test.after(async () => {
  await new Promise(resolvePromise => server.close(resolvePromise));
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  const body = await response.json();
  return { response, body };
}

test('lists seeded inbox threads', async () => {
  const { response, body } = await request('/api/threads?label=inbox');
  assert.equal(response.status, 200);
  assert.equal(body.threads.length, 2);
  assert.equal(body.threads[0].id, 'thread-1');
});

test('creates and sends a draft', async () => {
  const created = await request('/api/drafts', {
    method: 'POST',
    body: JSON.stringify({
      to: ['agent@google.com'],
      cc: [],
      bcc: [],
      subject: 'RL delivery test',
      body: 'Ship the Gmail environment.',
    }),
  });
  assert.equal(created.response.status, 201);
  const sent = await request(`/api/drafts/${created.body.draft.id}/send`, { method: 'POST' });
  assert.equal(sent.response.status, 200);
  assert.equal(sent.body.thread.labels.includes('sent'), true);
});

test('stars, archives, and restores a thread', async () => {
  const starred = await request('/api/threads/thread-2/star', {
    method: 'POST',
    body: JSON.stringify({ starred: true }),
  });
  assert.equal(starred.response.status, 200);
  assert.equal(starred.body.thread.starred, true);

  const archived = await request('/api/threads/thread-2/archive', { method: 'POST' });
  assert.equal(archived.response.status, 200);
  assert.equal(archived.body.thread.labels.includes('archive'), true);
  assert.equal(archived.body.thread.labels.includes('inbox'), false);

  const snapshots = await request('/api/snapshots');
  const priorSnapshot = snapshots.body.snapshots.find(snapshot => snapshot.reason === 'Initial fixture');
  assert.ok(priorSnapshot);

  const restored = await request(`/api/snapshots/${priorSnapshot.id}/restore`, { method: 'POST' });
  assert.equal(restored.response.status, 200);

  const thread = await request('/api/threads/thread-2');
  assert.equal(thread.body.thread.starred, false);
  assert.equal(thread.body.thread.labels.includes('inbox'), true);
});

test('serves the browser shell', async () => {
  const response = await fetch(`${baseUrl}/`);
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /Gmail RL/);
});
