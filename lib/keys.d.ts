export interface SessionKeyMaterial {
    privatePem: string;
    publicPem: string;
    keyid: string;
}
/**
 * Load the session signing key, generating a fresh pair on first use. The
 * private key never leaves the machine that runs the agent; the public key is
 * what a CI verifier checks signatures against.
 */
export declare function ensureKeys(keysDir: string): SessionKeyMaterial;
