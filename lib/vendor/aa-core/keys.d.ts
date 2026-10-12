export declare const DEFAULT_KEYS_DIR = ".agent-attest/keys";
/**
 * Private key location. CI can inject keys by pointing the env vars at file
 * paths (AGENT_ATTEST_PRIVATE_KEY / AGENT_ATTEST_PUBLIC_KEY).
 */
export declare function privateKeyPathFor(root: string): string;
export declare function publicKeyPathFor(root: string): string;
/** keyid = first 16 hex chars of sha256 over the public key SPKI DER. */
export declare function keyidFromPem(publicPem: string): string;
export declare function signBytes(privatePem: string, data: Buffer): Buffer;
export declare function verifyBytes(publicPem: string, data: Buffer, sig: Buffer): boolean;
export interface GeneratedKeys {
    keyid: string;
    privatePath: string;
    publicPath: string;
}
/**
 * Generate an ed25519 keypair and write private.pem (mode 0600, gitignored)
 * plus public.pem. Refuses to overwrite existing keys. If a repo is present,
 * `.agent-attest/keys/` is added to .gitignore and any tracked private key is
 * a hard error — a tracked private key hands every repo reader forge power.
 */
export declare function keygen(root: string, keysDir?: string): Promise<GeneratedKeys>;
/**
 * Refuse to operate when the private key is tracked by git. Anything tracked
 * is world-readable to everyone who can clone the repo, which equals forge
 * capability over the whole attestation chain.
 */
export declare function assertPrivateKeyNotTracked(root: string, privatePath: string): Promise<void>;
export interface KeyMaterial {
    privatePem: string;
    publicPem: string;
    keyid: string;
    privatePath: string;
    publicPath: string;
}
/** Load the signing material for a repo (env paths override repo defaults). */
export declare function loadKeyMaterial(root: string): KeyMaterial;
/** Load the public key used to verify attestations (env path overrides repo default). */
export declare function loadPublicKey(root: string): {
    publicPem: string;
    keyid: string;
    publicPath: string;
};
