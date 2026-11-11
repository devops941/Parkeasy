import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..');

/**
 * Recursively collects all .js file paths under the given directory.
 */
const collectJsFiles = (dir) => {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
};

/**
 * Verifies syntax across all backend source files and resolves core module imports.
 */
const runBuildCheck = async () => {
  const jsFiles = collectJsFiles(srcDir);
  for (const file of jsFiles) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  }

  // Verify core ESM entry modules resolve without missing imports
  await Promise.all([
    import('../app.js'),
    import('../config/db.js'),
    import('../jobs/expireBookingsJob.js'),
    import('../services/socketService.js'),
  ]);

  console.log(`[Build Check] Verified ${jsFiles.length} source files and core module imports.`);
};

runBuildCheck().catch((err) => {
  console.error('[Build Check] Failed:', err.message || err);
  process.exit(1);
});

