/**
 * Pure hash chain: tamper-evident, deterministically serialized records.
 * Each line chains to the previous digest; the whole chain verifies against
 * the head digest (publish it anywhere durable) and, when signing is on,
 * against the session's ed25519 key.
 */
import { createHash } from 'node:crypto';
import { canonicalJson } from './vendor/aa-core/canonical.js';
import { signBytes, verifyBytes } from './vendor/aa-core/keys.js';
export const GENESIS = '0'.repeat(64);
export function digestOf(seq, prevDigest, record) {
    return createHash('sha256')
        .update(canonicalJson({ seq, prevDigest, record }), 'utf8')
        .digest('hex');
}
export function makeLine(seq, prevDigest, record, privateKeyPem) {
    const digest = digestOf(seq, prevDigest, record);
    const line = { seq, prevDigest, record, digest };
    if (privateKeyPem !== undefined) {
        line.sig = signBytes(privateKeyPem, Buffer.from(digest, 'hex')).toString('base64');
    }
    return line;
}
export function toLineText(line) {
    return canonicalJson(line);
}
export function parseLineText(text) {
    return JSON.parse(text);
}
/** Full verification: links, digests, and (when keys provided) signatures. */
export function verifyChain(lines, publicKeyPem) {
    let prev = GENESIS;
    for (const line of lines) {
        if (line.prevDigest !== prev) {
            return { ok: false, lines: lines.length, headDigest: prev, firstBad: { seq: line.seq, reason: 'broken prev link' } };
        }
        const expected = digestOf(line.seq, line.prevDigest, line.record);
        if (line.digest !== expected) {
            return { ok: false, lines: lines.length, headDigest: prev, firstBad: { seq: line.seq, reason: 'digest mismatch' } };
        }
        if (publicKeyPem !== undefined) {
            if (line.sig === undefined) {
                return { ok: false, lines: lines.length, headDigest: prev, firstBad: { seq: line.seq, reason: 'missing signature' } };
            }
            if (!verifyBytes(publicKeyPem, Buffer.from(line.digest, 'hex'), Buffer.from(line.sig, 'base64'))) {
                return { ok: false, lines: lines.length, headDigest: prev, firstBad: { seq: line.seq, reason: 'signature invalid' } };
            }
        }
        prev = line.digest;
    }
    return { ok: true, lines: lines.length, headDigest: prev };
}
