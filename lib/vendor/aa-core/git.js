import { execFile } from "node:child_process";
export async function git(args, opts) {
    return await new Promise((resolvePromise, reject) => {
        execFile("git", ["-c", "core.quotePath=false", ...args], {
            cwd: opts.cwd,
            env: process.env,
            windowsHide: true,
            maxBuffer: 64 * 1024 * 1024,
            encoding: "utf8",
        }, (err, stdout, stderr) => {
            if (err) {
                const code = err.code;
                if (typeof code === "number") {
                    // Normal nonzero git exit (e.g. rev-parse of an unknown ref).
                    resolvePromise({ code, stdout: stdout ?? "", stderr: stderr ?? "" });
                    return;
                }
                // git itself missing / could not spawn
                reject(err);
                return;
            }
            resolvePromise({ code: 0, stdout: stdout ?? "", stderr: stderr ?? "" });
        });
    });
}
/** Repo working-tree root, or null when not inside a git repository. */
export async function repoRoot(cwd) {
    const r = await git(["rev-parse", "--show-toplevel"], { cwd });
    if (r.code !== 0)
        return null;
    return r.stdout.trim();
}
/** Resolve a ref to a full 40-hex commit sha, or null when it does not exist. */
export async function resolveCommit(cwd, ref) {
    const r = await git(["rev-parse", "--verify", `${ref}^{commit}`], { cwd });
    if (r.code !== 0)
        return null;
    return r.stdout.trim().toLowerCase();
}
/** Full commit message (%B) of a sha, or null when unavailable. */
export async function commitMessage(cwd, sha) {
    const r = await git(["log", "-1", "--format=%B", sha], { cwd });
    return r.code === 0 ? r.stdout : null;
}
/** Paths changed by a commit (works for root commits too via --root). */
export async function commitFiles(cwd, sha) {
    const r = await git(["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", sha], { cwd });
    if (r.code !== 0)
        return [];
    return r.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
}
/** Commits reachable from head but not base, oldest first. Null on a bad range. */
export async function revListRange(cwd, range) {
    const r = await git(["rev-list", range], { cwd });
    if (r.code !== 0)
        return null;
    return r.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .reverse();
}
/**
 * Structured log entries for the given revision arguments (a range, -n limits,
 * etc.), oldest first. Fields are NUL-separated and records RS-separated
 * (%x1e) so multi-line bodies survive; git forbids NUL in commit messages,
 * making the split unambiguous. Null when git log fails (bad range, no HEAD).
 */
export async function logEntries(cwd, revArgs) {
    const r = await git(["log", "--format=%H%x00%an%x00%aI%x00%s%x00%b%x1e", ...revArgs], { cwd });
    if (r.code !== 0)
        return null;
    const entries = [];
    for (const record of r.stdout.split("\x1e")) {
        const fields = record.split("\x00");
        if (fields.length < 5)
            continue;
        const [sha, author, date, subject, body] = fields;
        if (!sha || sha.trim().length !== 40)
            continue;
        entries.push({
            sha: sha.trim().toLowerCase(),
            author: (author ?? "").trim(),
            date: (date ?? "").trim(),
            subject: (subject ?? "").replace(/\n$/, "").trim(),
            body: (body ?? "").replace(/\n$/, ""),
        });
    }
    entries.reverse();
    return entries;
}
/**
 * Most recent tag reachable from HEAD (`git describe --abbrev=0 --tags`;
 * --tags so lightweight tags count too), or null when there is none.
 */
export async function latestTag(cwd) {
    const r = await git(["describe", "--abbrev=0", "--tags"], { cwd });
    if (r.code !== 0)
        return null;
    const tag = r.stdout.trim();
    return tag.length > 0 ? tag : null;
}
