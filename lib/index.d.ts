/**
 * dsh-attest — signed chain-of-custody for DeepSeek Harness sessions.
 *
 * Headless agents bypass PR gates entirely; chat UIs show what the agent said
 * it did. This plugin records what the agent actually did: every watched tool
 * result appends a hash-chained, ed25519-signed record to a durable JSONL
 * ledger. Tampering with any line breaks the chain; deleting the tail breaks
 * the published head. Zero LLM calls in the trust path.
 *
 * Family: dsh-read-guard guards what the agent READS, dsh-pr-gate gates what
 * it WRITES, dsh-attest proves what it DID.
 *
 * Thin adapter: canonical-JSON determinism and the ed25519 helpers are
 * vendored from agent-attest (`npm run sync`).
 */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export declare const name = "dsh-attest";
export interface Config {
    /** Tools whose results become custody records. */
    tools: string[];
    /** JSONL ledger path; empty string disables the plugin's writes. */
    ledgerPath: string;
    /** Directory for the session ed25519 keypair. */
    keysDir: string;
    /** Sign each record; false = digest chain only (still tamper-evident). */
    sign: boolean;
}
export declare const Config: Schema<Config>;
interface ToolExecView {
    readonly name: string;
    readonly callId: string;
    readonly agent?: unknown;
}
interface ToolResultView {
    readonly isError: boolean;
    readonly content: ({
        type: string;
    } & Record<string, unknown>)[];
}
declare module '@deepseek-ai/cordis' {
    interface Events {
        'tools/result': (exec: Readonly<ToolExecView>, result: Readonly<ToolResultView>) => undefined;
    }
}
export declare function apply(ctx: Context, config: Config): void;
export {};
