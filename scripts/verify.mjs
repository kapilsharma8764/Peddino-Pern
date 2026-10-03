#!/usr/bin/env node
/**
 * The whole check, in one command.
 *
 *     npm run verify            # everything
 *     npm run verify -- --skip-install
 *     npm run verify -- --only=unit,e2e
 *
 * Every stage runs in order and the first failure stops the run with a
 * non-zero exit code, so this is safe to put in front of a commit or a
 * pipeline. Nothing here touches the repository's own `server/data`: the
 * end-to-end stage points the API at a throwaway directory, and the account
 * it works under is created fresh inside the run.
 *
 * Deliberately plain Node with no dependencies of its own — a pipeline that
 * needs its own install step before it can tell you whether install works is
 * one more thing to go wrong.
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const client = join(root, 'client')
const server = join(root, 'server')
const reports = join(root, 'reports')

const argv = process.argv.slice(2)
const skipInstall = argv.includes('--skip-install')
const only = argv
  .find((arg) => arg.startsWith('--only='))
  ?.slice('--only='.length)
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean)

// Ports the end-to-end stage uses. Kept away from the dev defaults (8001,
// 5200) so a running dev server is neither disturbed nor accidentally tested.
const API_PORT = process.env.E2E_API_PORT ?? '8123'
const WEB_PORT = process.env.E2E_WEB_PORT ?? '5299'
const dataDir = process.env.E2E_DATA_DIR ?? mkdtempSync(join(tmpdir(), 'sitebuilder-verify-'))

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

/**
 * Windows needs a shell to run `npm.cmd` and `npx.cmd`, and a shell splits an
 * unquoted argument on its spaces — which silently breaks any path with a
 * space in it, such as a project living under "David task". Quoting here means
 * a caller can pass ordinary strings and stop thinking about it.
 */
function quote(value) {
  if (process.platform !== 'win32') return value
  return /[\s"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value
}

function run(command, args, options = {}) {
  return new Promise((done, fail) => {
    const shell = process.platform === 'win32'
    const child = spawn(command, shell ? args.map(quote) : args, {
      stdio: 'inherit',
      shell,
      ...options,
    })
    child.on('error', fail)
    child.on('close', (code) =>
      code === 0 ? done() : fail(new Error(`${command} ${args.join(' ')} exited with ${code}`)),
    )
  })
}

/**
 * The stages, in the order a failure is most useful.
 *
 * Cheap and specific first: a type error should be reported as a type error in
 * two seconds, not as a mystifying end-to-end failure four minutes in.
 */
const stages = [
  {
    name: 'install',
    describe: 'Install both workspaces from their lockfiles',
    skip: () => skipInstall,
    async run() {
      // `npm ci` rather than `npm install`: it installs exactly what the
      // lockfile says and fails if the lockfile and manifest disagree.
      await run(npm, ['ci'], { cwd: client })
      await run(npm, ['ci'], { cwd: server })
    },
  },
  {
    name: 'lint',
    describe: 'ESLint over the client',
    run: () => run(npm, ['run', 'lint'], { cwd: client }),
  },
  {
    name: 'typecheck',
    describe: 'TypeScript, no emit',
    run: () => run(npx, ['tsc', '-b', '--force'], { cwd: client }),
  },
  {
    name: 'unit',
    describe: 'Unit and integration tests, client and server',
    async run() {
      mkdirSync(reports, { recursive: true })
      // Relative to the client, so the path the reporter is handed carries no
      // spaces of its own whatever the project is checked out into.
      await run(npx, ['vitest', 'run', '--reporter=default', '--reporter=json', '--outputFile=../reports/vitest.json'], {
        cwd: client,
      })
      await run(npm, ['test'], { cwd: server })
    },
  },
  {
    name: 'build',
    describe: 'Production build, pointed at the test API',
    run: () =>
      run(npm, ['run', 'build'], {
        cwd: client,
        // Baked in at build time, because the client reads it through
        // `import.meta.env`. This is what lets the end-to-end stage serve the
        // real build artefact instead of the dev server.
        env: { ...process.env, VITE_API_URL: `http://127.0.0.1:${API_PORT}` },
      }),
  },
  {
    name: 'e2e',
    describe: 'Browser end-to-end tests, including the exported website',
    run: () =>
      // Playwright starts the API and the static server itself, waits on their
      // readiness endpoints, and shuts them down afterwards.
      run(npx, ['playwright', 'test'], {
        cwd: client,
        env: {
          ...process.env,
          E2E_API_PORT: API_PORT,
          E2E_WEB_PORT: WEB_PORT,
          E2E_DATA_DIR: dataDir,
        },
      }),
  },
]

const selected = stages.filter((stage) => !only || only.includes(stage.name))

if (selected.length === 0) {
  console.error(`Nothing to run. Known stages: ${stages.map((s) => s.name).join(', ')}`)
  process.exit(2)
}

const results = []
let failure = null

console.log(`\nVerifying ${root}`)
console.log(`Test data directory: ${dataDir}\n`)

for (const stage of selected) {
  if (stage.skip?.()) {
    console.log(`— ${stage.name}: skipped`)
    results.push({ stage: stage.name, status: 'skipped' })
    continue
  }

  console.log(`\n══ ${stage.name} — ${stage.describe}\n`)
  const started = Date.now()
  try {
    await stage.run()
    results.push({ stage: stage.name, status: 'passed', ms: Date.now() - started })
  } catch (error) {
    results.push({ stage: stage.name, status: 'failed', ms: Date.now() - started, error: error.message })
    failure = error
    break
  }
}

// Written whether the run passed or failed — a summary is most wanted when
// something broke.
mkdirSync(reports, { recursive: true })
writeFileSync(join(reports, 'verify-summary.json'), JSON.stringify({ results, dataDir }, null, 2))

console.log('\n─── summary ───')
for (const result of results) {
  const time = result.ms === undefined ? '' : ` (${(result.ms / 1000).toFixed(1)}s)`
  console.log(`  ${result.status.padEnd(8)} ${result.stage}${time}`)
}
if (!failure) console.log(`  ${'—'.padEnd(8)} reports in ${reports} and client/playwright-report`)

// Only the directory this run made is removed, and only when it made one.
if (!process.env.E2E_DATA_DIR && existsSync(dataDir)) {
  rmSync(dataDir, { recursive: true, force: true })
}

if (failure) {
  console.error(`\nFAILED at "${results.at(-1).stage}": ${failure.message}`)
  process.exit(1)
}

console.log('\nAll checks passed.\n');
