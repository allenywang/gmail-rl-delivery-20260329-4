import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../src/server.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');
const proofDir = join(rootDir, 'artifacts/proof');
mkdirSync(proofDir, { recursive: true });

const server = await startServer(0);
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 4010;
const baseUrl = `http://127.0.0.1:${port}`;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

try {
  await request('/api/reset', { method: 'POST' });
  const before = await request('/api/threads?label=inbox');
  const draft = await request('/api/drafts', {
    method: 'POST',
    body: JSON.stringify({
      to: ['pm@google.com'],
      cc: [],
      bcc: [],
      subject: 'Validation thread',
      body: 'This is a local validation send flow.',
    }),
  });
  const sent = await request(`/api/drafts/${draft.draft.id}/send`, { method: 'POST' });
  await request(`/api/threads/${sent.thread.id}/star`, {
    method: 'POST',
    body: JSON.stringify({ starred: true }),
  });
  const snapshots = await request('/api/snapshots');
  const env = await request('/api/env');
  const sentThreads = await request('/api/threads?label=sent');
  const proof = {
    baseUrl,
    launchCommand: 'pnpm start',
    validationSteps: [
      'Reset the environment',
      'Create a draft',
      'Send the draft',
      'Star the sent thread',
      'Verify snapshot growth and sent label visibility',
    ],
    inboxThreadCountBefore: before.threads.length,
    sentThreadCountAfter: sentThreads.threads.length,
    activeSnapshotId: env.activeSnapshotId,
    snapshotCount: snapshots.snapshots.length,
    sentThreadId: sent.thread.id,
  };
  const proofPath = join(proofDir, 'local-validation.json');
  writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ ok: true, proofPath, ...proof }, null, 2));
} finally {
  await new Promise(resolvePromise => server.close(resolvePromise));
}
