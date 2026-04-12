#!/usr/bin/env node
/**
 * scripts/dev-worker.mjs
 *
 * Cross-platform replacement for `mkdir -p dist && wrangler dev`.
 * Ensures the assets directory exists (wrangler requires it even in dev),
 * then spawns the wrangler dev server.
 *
 * Usage (via npm):  npm run dev:worker
 * Direct:           node scripts/dev-worker.mjs [--port 8787]
 */

import { mkdirSync } from 'fs';
import { spawn } from 'child_process';
import { program } from 'commander';

program
  .name('dev:worker')
  .description('Start the Cloudflare Worker dev server (creates dist/ if absent)')
  .option('-p, --port <port>', 'wrangler dev port', '8787')
  .parse();

const { port } = program.opts();

// wrangler requires assets.directory to exist even when Vite serves the frontend
mkdirSync('dist', { recursive: true });

const wrangler = spawn(
  'wrangler',
  ['dev', '--port', port],
  { stdio: 'inherit', shell: true }
);

wrangler.on('exit', (code) => process.exit(code ?? 0));
