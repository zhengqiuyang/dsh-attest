/**
 * Deterministic JSON canonicalization: object keys are recursively sorted,
 * insignificant whitespace removed, `undefined` object values dropped.
 * The canonical form is what gets hashed and signed, so every consumer
 * computing it independently agrees byte-for-byte.
 */
export declare function canonicalJson(value: unknown): string;
