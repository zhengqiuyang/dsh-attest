export declare const GENESIS: string;
/** What actually happened — the fields a custody record swears to. */
export interface CustodyRecord {
    time: string;
    tool: string;
    callId: string;
    isError: boolean;
    /** sha256 of the model-facing content, hex. */
    contentSha256: string;
}
export interface ChainLine {
    seq: number;
    prevDigest: string;
    record: CustodyRecord;
    digest: string;
    /** ed25519 signature over the digest bytes, base64; absent when unsigned. */
    sig?: string;
}
export declare function digestOf(seq: number, prevDigest: string, record: CustodyRecord): string;
export declare function makeLine(seq: number, prevDigest: string, record: CustodyRecord, privateKeyPem?: string): ChainLine;
export declare function toLineText(line: ChainLine): string;
export declare function parseLineText(text: string): ChainLine;
export interface ChainVerification {
    ok: boolean;
    lines: number;
    headDigest: string;
    firstBad?: {
        seq: number;
        reason: string;
    };
}
/** Full verification: links, digests, and (when keys provided) signatures. */
export declare function verifyChain(lines: ChainLine[], publicKeyPem?: string): ChainVerification;
