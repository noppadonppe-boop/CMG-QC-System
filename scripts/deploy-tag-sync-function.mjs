import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, '$1');
    env[key] = value;
  }

  return env;
}

function run(command, args, envOverrides = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...envOverrides },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const envPath = resolve(rootDir, '.env');
const env = readEnvFile(envPath);

const projectId = env.VITE_FIREBASE_PROJECT_ID || 'cmg-event-managment';
const tagSyncSecret = env.TAG_SYNC_SECRET || '';

if (!tagSyncSecret) {
  console.error('TAG_SYNC_SECRET is missing in the root .env file.');
  process.exit(1);
}

run('npx', [
  'firebase-tools',
  'functions:config:set',
  `tag.sync_secret=${tagSyncSecret}`,
  '--project',
  projectId,
]);

run('npx', [
  'firebase-tools',
  'deploy',
  '--only',
  'functions:syncGoogleSheetTagNos',
  '--project',
  projectId,
]);
