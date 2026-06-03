/**
 * lint-staged config as an ES module so we can use functions.
 *
 * On Windows, passing 200+ staged file paths as CLI arguments exceeds
 * MAX_COMMAND_LINE_LENGTH. Using a function lets lint-staged call the
 * task with the file list, but we ignore it and run eslint on the fixed
 * directories instead — same coverage, no length limit.
 */
export default {
  '*.{js,jsx,ts,tsx}': () =>
    'eslint --fix apps/shell/src/ apps/editor-remote/src/ apps/analytics-remote/src/ packages/',
};
