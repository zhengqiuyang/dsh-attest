/**
 * Thin, Windows-safe git plumbing built on execFile (never a shell string).
 * Read-only operations only — agent-attest never mutates the repository.
 */
export interface GitResult {
    code: number;
    stdout: string;
    stderr: string;
}
export declare function git(args: string[], opts: {
    cwd: string;
}): Promise<GitResult>;
/** Repo working-tree root, or null when not inside a git repository. */
export declare function repoRoot(cwd: string): Promise<string | null>;
/** Resolve a ref to a full 40-hex commit sha, or null when it does not exist. */
export declare function resolveCommit(cwd: string, ref: string): Promise<string | null>;
/** Full commit message (%B) of a sha, or null when unavailable. */
export declare function commitMessage(cwd: string, sha: string): Promise<string | null>;
/** Paths changed by a commit (works for root commits too via --root). */
export declare function commitFiles(cwd: string, sha: string): Promise<string[]>;
/** Commits reachable from head but not base, oldest first. Null on a bad range. */
export declare function revListRange(cwd: string, range: string): Promise<string[] | null>;
export interface GitLogEntry {
    sha: string;
    author: string;
    /** ISO 8601 author date (%aI). */
    date: string;
    subject: string;
    body: string;
}
/**
 * Structured log entries for the given revision arguments (a range, -n limits,
 * etc.), oldest first. Fields are NUL-separated and records RS-separated
 * (%x1e) so multi-line bodies survive; git forbids NUL in commit messages,
 * making the split unambiguous. Null when git log fails (bad range, no HEAD).
 */
export declare function logEntries(cwd: string, revArgs: string[]): Promise<GitLogEntry[] | null>;
/**
 * Most recent tag reachable from HEAD (`git describe --abbrev=0 --tags`;
 * --tags so lightweight tags count too), or null when there is none.
 */
export declare function latestTag(cwd: string): Promise<string | null>;
