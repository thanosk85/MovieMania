// Runs sync-movies.mjs at most once per day. Used by the "SyncMovies" Windows scheduled task at logon
// (see scripts/register-sync-movies-task.ps1). Use --force to run even if today's sync already succeeded.
// Logs: %LOCALAPPDATA%\sync-movies\sync-movies.log
import { spawn } from 'node:child_process';
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const stateDir = join(process.env.LOCALAPPDATA ?? homedir(), 'sync-movies');
const logFile = join(stateDir, 'sync-movies.log');
const lastSuccessFile = join(stateDir, 'last-success.txt');
const today = new Date().toLocaleDateString('sv-SE'); // local date as YYYY-MM-DD
const force = process.argv.includes('--force');

mkdirSync(stateDir, { recursive: true });

function log(message) {
  appendFileSync(logFile, `[${new Date().toLocaleString('sv-SE')}] ${message}\n`);
}

async function waitForNetwork(attempts = 30, delayMs = 10_000) {
  for (let i = 0; i < attempts; i++) {
    try {
      await fetch('https://api.themoviedb.org', { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

async function main() {
  if (!force && existsSync(lastSuccessFile) && readFileSync(lastSuccessFile, 'utf8').trim() === today) {
    log('Already synced today, skipping.');
    return 0;
  }

  if (!(await waitForNetwork())) {
    log('No internet connection, sync will be retried at next logon.');
    return 1;
  }

  log('Starting sync...');
  const fd = openSync(logFile, 'a');
  const exitCode = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['--env-file=.env', 'scripts/sync-movies.mjs'], {
      cwd: projectRoot,
      stdio: ['ignore', fd, fd],
      windowsHide: true,
    });
    child.on('error', (e) => {
      log(`Failed to start sync: ${e.message}`);
      resolve(1);
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
  closeSync(fd);

  if (exitCode === 0) {
    writeFileSync(lastSuccessFile, today);
    log('Sync completed successfully.');
  } else {
    log(`Sync failed with exit code ${exitCode}, will retry at next logon.`);
  }
  return exitCode;
}

process.exitCode = await main();
