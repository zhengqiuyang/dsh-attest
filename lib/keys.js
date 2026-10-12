/**
 * Session key management: ed25519 PEM pair on disk, generated on first use.
 * Key format and id derivation come from the vendored agent-attest helpers so
 * CI-side verification reads the same material.
 */
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { keyidFromPem } from './vendor/aa-core/keys.js';
function privatePath(keysDir) {
    return join(keysDir, 'session_ed25519.pem');
}
function publicPath(keysDir) {
    return join(keysDir, 'session_ed25519.pub.pem');
}
/**
 * Load the session signing key, generating a fresh pair on first use. The
 * private key never leaves the machine that runs the agent; the public key is
 * what a CI verifier checks signatures against.
 */
export function ensureKeys(keysDir) {
    const priv = privatePath(keysDir);
    const pub = publicPath(keysDir);
    if (existsSync(priv) && existsSync(pub)) {
        return {
            privatePem: readFileSync(priv, 'utf8'),
            publicPem: readFileSync(pub, 'utf8'),
            keyid: keyidFromPem(readFileSync(pub, 'utf8')),
        };
    }
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    mkdirSync(keysDir, { recursive: true });
    writeFileSync(priv, privatePem, { mode: 0o600 });
    writeFileSync(pub, publicPem);
    console.warn(`[dsh-attest] generated session signing key in ${keysDir} — add it to .gitignore ` +
        `(the PRIVATE half must never be committed; the public half is what CI verifies against).`);
    return { privatePem, publicPem, keyid: keyidFromPem(publicPem) };
}
