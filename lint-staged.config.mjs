/**
 * lint-staged config as an ES module so we can use functions.
 *
 * On Windows, passing 200+ staged file paths as CLI arguments exceeds
 * MAX_COMMAND_LINE_LENGTH. Using a function lets lint-staged call the
 * task with the file list, but we ignore it and run eslint on the fixed
 * directories instead - same coverage, no length limit.
 *
 * Docker-based dev environments: node_modules live in a Docker volume and are
 * not accessible on the host. When the shell container is running, delegate to
 * its eslint binary so the full project eslint config (incl. TypeScript plugins)
 * resolves correctly. Falls back to a host-local `eslint` on CI and standard
 * setups where node_modules is installed on the host.
 */
import { execSync } from 'child_process';

function eslintCmd() {
  try {
    execSync('docker inspect fixmytext-shell-dev --format={{.State.Running}}', { stdio: 'pipe' });
    return 'docker exec fixmytext-shell-dev /app/node_modules/.bin/eslint --fix apps/shell/src/ apps/editor-remote/src/ apps/analytics-remote/src/ packages/';
  } catch {
    return 'eslint --fix apps/shell/src/ apps/editor-remote/src/ apps/analytics-remote/src/ packages/';
  }
}

export default {
  '*.{js,jsx,ts,tsx}': () => eslintCmd(),
};
