/**
 * Read a text file with BOM stripped and CRLF (or lone CR) normalized to LF.
 * All parsing of human/editor-touched text files goes through this so the
 * tool behaves identically on Windows checkouts and POSIX ones.
 */
export declare function readTextNormalized(path: string): string;
/** Convert backslashes to forward slashes (Windows-safe path comparison). */
export declare function toPosix(p: string): string;
/** Normalize a repo-relative path for glob matching. */
export declare function normalizePath(p: string): string;
export declare function errorMessage(err: unknown): string;
