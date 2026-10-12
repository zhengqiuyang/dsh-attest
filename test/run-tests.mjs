/**
 * Unit tests for the pure chain/key logic — no DSH host needed.
 * Run: npm test  (syncs vendor core, builds, then runs this file)
 */
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GENESIS,
  digestOf,
  makeLine,
  parseLineText,
  toLineText,
  verifyChain,
} from '../lib/chain.js';
import { ensureKeys } from '../lib/keys.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${name}`);
    console.error(err.message);
  }
}

const REC_A = {
  time: '2026-10-12T10:00:00.000Z',
  tool: 'bash',
  callId: 'c1',
  isError: false,
  contentSha256: 'a'.repeat(64),
};
const REC_B = {
  time: '2026-10-12T10:00:01.000Z',
  tool: 'write',
  callId: 'c2',
  isError: false,
  contentSha256: 'b'.repeat(64),
};

function unsignedChain() {
  const l1 = makeLine(0, GENESIS, REC_A);
  const l2 = makeLine(1, l1.digest, REC_B);
  return [l1, l2];
}

console.log('chain');

await test('lines link head to tail', () => {
  const [l1, l2] = unsignedChain();
  assert.equal(l1.prevDigest, GENESIS);
  assert.equal(l2.prevDigest, l1.digest);
  assert.equal(l1.seq, 0);
  assert.equal(l2.seq, 1);
});

await test('digest is deterministic and matches recomputation', () => {
  const l1 = makeLine(0, GENESIS, REC_A);
  assert.equal(digestOf(0, GENESIS, REC_A), l1.digest);
});

await test('unsigned chain verifies', () => {
  const v = verifyChain(unsignedChain());
  assert.equal(v.ok, true);
  assert.equal(v.lines, 2);
  assert.equal(v.headDigest, unsignedChain()[1].digest);
});

await test('tampered record content is caught', () => {
  const lines = unsignedChain();
  const tampered = { ...lines[1], record: { ...REC_B, tool: 'read' } };
  const v = verifyChain([lines[0], tampered]);
  assert.equal(v.ok, false);
  assert.equal(v.firstBad.seq, 1);
  assert.equal(v.firstBad.reason, 'digest mismatch');
});

await test('broken link is caught', () => {
  const lines = unsignedChain();
  const orphan = makeLine(1, GENESIS, REC_B);
  const v = verifyChain([lines[0], orphan]);
  assert.equal(v.ok, false);
  assert.equal(v.firstBad.reason, 'broken prev link');
});

await test('truncation is detectable against a known head', () => {
  const lines = unsignedChain();
  const full = verifyChain(lines);
  const truncated = verifyChain(lines.slice(0, 1));
  assert.notEqual(truncated.headDigest, full.headDigest);
});

await test('line text roundtrips', () => {
  const l1 = makeLine(0, GENESIS, REC_A);
  assert.deepEqual(parseLineText(toLineText(l1)), l1);
});

console.log('signing');

await test('signed chain verifies with the public key', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const l1 = makeLine(0, GENESIS, REC_A, privPem);
  const l2 = makeLine(1, l1.digest, REC_B, privPem);
  assert.ok(typeof l1.sig === 'string');
  assert.equal(verifyChain([l1, l2], pubPem).ok, true);
});

await test('signature from a different key is rejected', () => {
  const signer = generateKeyPairSync('ed25519');
  const other = generateKeyPairSync('ed25519');
  const privPem = signer.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const otherPub = other.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const l1 = makeLine(0, GENESIS, REC_A, privPem);
  const v = verifyChain([l1], otherPub);
  assert.equal(v.ok, false);
  assert.equal(v.firstBad.reason, 'signature invalid');
});

await test('unsigned line fails signature verification', () => {
  const other = generateKeyPairSync('ed25519');
  const pubPem = other.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const v = verifyChain(unsignedChain(), pubPem);
  assert.equal(v.ok, false);
  assert.equal(v.firstBad.reason, 'missing signature');
});

console.log('session keys');

await test('ensureKeys generates, persists, and reloads the same pair', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-attest-'));
  try {
    const first = ensureKeys(dir);
    assert.ok(first.privatePem.includes('PRIVATE KEY'));
    assert.ok(first.publicPem.includes('PUBLIC KEY'));
    assert.ok(first.keyid.length >= 16);
    const second = ensureKeys(dir);
    assert.equal(second.privatePem, first.privatePem);
    assert.equal(second.publicPem, first.publicPem);
    // Private key file exists on disk with the exact PEM.
    assert.equal(readFileSync(join(dir, 'session_ed25519.pem'), 'utf8'), first.privatePem);
    // A record signed by the loaded key verifies against the public half.
    const l = makeLine(0, GENESIS, REC_A, first.privatePem);
    assert.equal(verifyChain([l], first.publicPem).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});


console.log('commits');

await test('commit markers extracted from git output', async () => {
  const { extractCommitShas } = await import('../lib/commits.js');
  assert.deepEqual(extractCommitShas('[main a1b2c3d] fix: thing'), ['a1b2c3d']);
  assert.deepEqual(extractCommitShas('[feature/x 1a2b3c4d5e] wip\n 2 files changed'), ['1a2b3c4d5e']);
  assert.deepEqual(extractCommitShas('nothing to commit, working tree clean'), []);
});

await test('custody record carries commitSha when present', async () => {
  const { makeLine, verifyChain, GENESIS } = await import('../lib/chain.js');
  const { generateKeyPairSync } = await import('node:crypto');
  const { privateKey } = generateKeyPairSync('ed25519');
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const rec = {
    time: 't', tool: 'bash', callId: 'c1', isError: false,
    contentSha256: 'a'.repeat(64), commitSha: 'a1b2c3d',
  };
  const line = makeLine(0, GENESIS, rec, privPem);
  assert.equal(line.record.commitSha, 'a1b2c3d');
  assert.equal(line.sig !== undefined, true);
});

console.log('');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
