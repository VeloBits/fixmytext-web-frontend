/**
 * lint-staged config as an ES module so we can use functions.
 *
 * On Windows, passing 200+ staged file paths as CLI arguments exceeds
 * MAX_COMMAND_LINE_LENGTH. Using a function lets lint-staged call the
 * task with the file list, but we ignore it and run eslint on the fixed
 * directories instead — same coverage, no length limit.
 *
 * Guard: if node_modules are not installed on the host (e.g. dev runs
 * inside Docker), return an empty task list so the commit is not blocked.
 */
import { existsSync } from 'fs';

const eslintBin = new URL('./node_modules/.bin/eslint', import.meta.url);
const hasEslint = existsSync(eslintBin);

export default {
  '*.{js,jsx,ts,tsx}': hasEslint
    ? () =>
        'node_modules/.bin/eslint --fix apps/shell/src/ apps/editor-remote/src/ apps/analytics-remote/src/ packages/'
    : () => [],
};
