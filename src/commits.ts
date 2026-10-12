/**
 * Commit attribution: extract commit identities from git commit output so a
 * custody record can bind "the session made THIS commit" into the signed
 * chain. Pure and conservative — only standard `[branch sha] msg` markers.
 */

/** Short or full SHAs git prints in commit-output markers. */
const COMMIT_MARKER_RE = /\[[^\s\]]+\s+([0-9a-f]{7,40})\]/g;

export function extractCommitShas(text: string): string[] {
  const shas: string[] = [];
  for (const m of text.matchAll(COMMIT_MARKER_RE)) {
    const sha = m[1] ?? '';
    // Guard against date-like or hash-like false positives (git SHAs are hex).
    if (/^[0-9a-f]{7,40}$/.test(sha)) shas.push(sha);
  }
  return [...new Set(shas)];
}
