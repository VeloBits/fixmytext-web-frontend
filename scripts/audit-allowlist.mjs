/**
 * Dependency audit gate with a reviewed allowlist.
 *
 * Replaces a bare `npm audit --audit-level=high`, which is all-or-nothing: it cannot
 * distinguish "we have a real problem" from "this advisory does not apply to us and has
 * no fix we can take". That leaves the only escape hatch being to drop the gate, or to
 * take a downgrade npm suggests. Both are worse than an explicit, dated exception.
 *
 * Fails when:
 *   - any advisory at/above THRESHOLD is not in the allowlist
 *   - an allowlist entry is past its reviewBy date (an exception must not rot silently)
 *   - an allowlist entry is malformed
 *
 * Warns (does not fail) when an allowlist entry no longer matches anything -- that means
 * the advisory is fixed or the dependency is gone, so the entry should be deleted.
 *
 * Run: node scripts/audit-allowlist.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const THRESHOLD = 'high';
const RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

const here = dirname(fileURLToPath(import.meta.url));
const ALLOWLIST_PATH = join(here, 'audit-allowlist.json');

/** `npm audit` exits non-zero when it finds anything, so the exit code is not an error. */
function runAudit() {
  let stdout;
  try {
    stdout = execFileSync('npm', ['audit', '--json'], {
      cwd: join(here, '..'),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    // Populated on non-zero exit; genuinely broken invocations have no parseable stdout.
    stdout = err.stdout;
  }
  if (!stdout) throw new Error('npm audit produced no output');

  const report = JSON.parse(stdout);
  if (!report.vulnerabilities) {
    throw new Error(`unexpected npm audit format (auditReportVersion=${report.auditReportVersion})`);
  }
  return report;
}

/**
 * Collect the distinct advisories at/above THRESHOLD.
 *
 * A `via` entry is either an advisory object (the package is directly affected) or a
 * string naming another package (the package is only affected transitively). Only objects
 * carry an advisory id, so keying on them means a transitively-affected package such as
 * react-router-dom needs no allowlist entry of its own -- it is covered by the entry for
 * the package that actually holds the advisory.
 */
function collectAdvisories(report) {
  const found = new Map();

  for (const vuln of Object.values(report.vulnerabilities)) {
    for (const via of vuln.via) {
      if (typeof via === 'string') continue;

      const severity = via.severity ?? vuln.severity;
      if (RANK[severity] < RANK[THRESHOLD]) continue;

      const id = via.url?.split('/').pop();
      if (!id) continue;

      // Same advisory can surface under several packages; key by both so an allowlist
      // entry can never excuse an advisory for a package it was not reviewed against.
      found.set(`${id}::${via.name ?? vuln.name}`, {
        id,
        package: via.name ?? vuln.name,
        severity,
        range: via.range,
        title: via.title,
      });
    }
  }

  return [...found.values()];
}

function loadAllowlist() {
  const parsed = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  const entries = parsed.allow ?? [];

  const problems = [];
  entries.forEach((entry, i) => {
    for (const field of ['advisory', 'package', 'reviewBy', 'reason']) {
      if (!entry[field]) problems.push(`allow[${i}] is missing "${field}"`);
    }
    if (entry.reviewBy && Number.isNaN(Date.parse(entry.reviewBy))) {
      problems.push(`allow[${i}] has an unparseable reviewBy "${entry.reviewBy}"`);
    }
  });
  if (problems.length) {
    throw new Error(`invalid ${ALLOWLIST_PATH}:\n  - ${problems.join('\n  - ')}`);
  }

  return entries;
}

function main() {
  const allowlist = loadAllowlist();
  const advisories = collectAdvisories(runAudit());
  const keyOf = (a) => `${a.advisory ?? a.id}::${a.package}`;

  const allowed = new Map(allowlist.map((entry) => [keyOf(entry), entry]));
  const blocking = advisories.filter((a) => !allowed.has(keyOf(a)));
  const suppressed = advisories.filter((a) => allowed.has(keyOf(a)));

  // Compare dates only -- a reviewBy of today is still valid.
  const today = new Date().toISOString().slice(0, 10);
  const expired = allowlist.filter((entry) => entry.reviewBy < today);
  const unused = allowlist.filter(
    (entry) => !advisories.some((a) => keyOf(a) === keyOf(entry))
  );

  for (const entry of suppressed) {
    const meta = allowed.get(keyOf(entry));
    console.log(
      `ALLOWED  ${entry.severity.padEnd(8)} ${entry.id}  ${entry.package}  (review by ${meta.reviewBy})`
    );
  }

  for (const entry of unused) {
    console.log(
      `STALE    ${entry.advisory} (${entry.package}) no longer matches any finding -- ` +
        `remove it from ${ALLOWLIST_PATH.replace(/.*\//, 'scripts/')}`
    );
  }

  for (const entry of expired) {
    console.error(
      `EXPIRED  ${entry.advisory} (${entry.package}) was due for review on ${entry.reviewBy}`
    );
  }

  for (const a of blocking) {
    console.error(`BLOCKING ${a.severity.padEnd(8)} ${a.id}  ${a.package}@${a.range}  ${a.title}`);
  }

  if (blocking.length || expired.length) {
    console.error(
      `\nFAIL: ${blocking.length} unreviewed advisory/advisories at ${THRESHOLD}+, ` +
        `${expired.length} expired exception(s).`
    );
    console.error(
      'Fix the dependency, or -- only if the vulnerable path is unreachable here -- add a ' +
        'reviewed entry to scripts/audit-allowlist.json explaining why.'
    );
    process.exit(1);
  }

  console.log(
    `\nPASS: no unreviewed advisories at ${THRESHOLD}+ ` +
      `(${suppressed.length} reviewed exception(s) in effect).`
  );
}

try {
  main();
} catch (err) {
  // A broken allowlist or an unreadable audit report is a gate failure, not a crash --
  // print something a CI log reader can act on instead of a stack trace.
  console.error(`FAIL: dependency audit gate could not run.\n${err.message}`);
  process.exit(1);
}
