import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const source = path => path.startsWith('src/') && /\.[cm]?[jt]sx?$/.test(path)
const sharedFrontend = path => /^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|vite\.config\.|vitest\.config\.|tsconfig[^/]*\.json|eslint\.config\.|src\/test\/)/.test(path) || (path.startsWith('src/') && /\.css$/.test(path))
const check = (label, command, args) => ({ label, command, args })
const pnpm = (label, ...args) => check(label, 'pnpm', args)

/** Commit checks are a feedback loop; the full pre-push suite remains authoritative. */
export function planChecks(files, { removed = false } = {}) {
  const plan = []
  const frontend = files.filter(source)
  const rust = files.filter(path => path.startsWith('src-tauri/') || /^Cargo\.(toml|lock)$/.test(path))
  const ipcChanged = rust.some(path => /\/commands(?:\/|\.rs$)|\/(?:lib|main|models|session_models)\.rs$|\/schema\.sql$/.test(path))
  const fullFrontend = files.some(sharedFrontend) || ipcChanged || (removed && frontend.length > 0)
  const lintFiles = files.filter(path => /\.[cm]?[jt]sx?$/.test(path) && !path.startsWith('src-tauri/'))
  if (fullFrontend) plan.push(pnpm('Frontend lint', 'lint'))
  else if (lintFiles.length) plan.push(pnpm('Changed-file lint', 'exec', 'eslint', '--max-warnings=0', ...lintFiles))
  if (fullFrontend || frontend.some(path => /\.tsx?$/.test(path))) plan.push(pnpm('Incremental types', 'exec', 'tsc', '-b'))
  if (fullFrontend) plan.push(pnpm('Full frontend tests (shared change)', 'exec', 'vitest', 'run', '--silent'))
  else if (frontend.length) plan.push(pnpm('Related frontend tests', 'exec', 'vitest', 'related', '--run', ...frontend))
  if (rust.length) {
    plan.push(check('Rust formatting', 'cargo', ['fmt', '--manifest-path', 'src-tauri/Cargo.toml', '--', '--check']))
    const learningOnly = !removed && rust.every(path => path.startsWith('src-tauri/src/learning/'))
    plan.push(check('Rust tests', 'cargo', ['test', '--manifest-path', 'src-tauri/Cargo.toml', '--lib', ...(learningOnly ? ['learning::'] : []), '--', '--test-threads=1']))
  }
  if (files.some(path => path.startsWith('scripts/') || path.startsWith('.husky/'))) {
    plan.push(check('Workflow regression tests', 'node', ['--test', 'scripts/precommit-checks.test.mjs']))
  }
  const integration = files.filter(path => path.startsWith('tests/integration/') && path.endsWith('.spec.ts'))
  const browser = files.filter(path => path.startsWith('tests/') && path.endsWith('.spec.ts') && !integration.includes(path))
  if (integration.length) plan.push(pnpm('Changed integration tests', 'exec', 'playwright', 'test', '--config', 'playwright.integration.config.ts', ...integration))
  if (browser.length) plan.push(pnpm('Changed browser tests', 'exec', 'playwright', 'test', ...browser))
  if (files.some(path => path.startsWith('tests/helpers/') || /^playwright.*config/.test(path))) plan.push(pnpm('Core smoke for shared browser setup', 'playwright:smoke'))
  if (files.some(path => path.startsWith('site/'))) plan.push(pnpm('Documentation build', 'docs:build'))
  if (files.some(path => path.startsWith('src/lib/locales/'))) plan.push(pnpm('Locale validation', 'l10n:validate'))
  return plan
}

export function runChecks(plan, run = spawnSync) {
  for (const { label, command, args } of plan) {
    console.log(`  → ${label}`)
    const result = run(command, args, { stdio: 'inherit', shell: false })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`${label} failed${result.signal ? ` (${result.signal})` : ''}`)
  }
}

function gitFiles(...args) {
  const result = spawnSync('git', ['diff', '--cached', '--name-only', '-z', ...args], { encoding: 'utf8' })
  if (result.error || result.status !== 0) throw result.error ?? new Error('Cannot inspect staged changes')
  return result.stdout.split('\0').filter(Boolean)
}
function main() {
  const files = gitFiles()
  const removed = gitFiles('--diff-filter=DR').length > 0
  const plan = planChecks(files, { removed })
  // Deleted lint targets cannot be read; full tests still protect their consumers.
  for (const entry of plan) {
    if (entry.args[1] === 'eslint') entry.args = entry.args.filter(arg => !files.includes(arg) || existsSync(arg))
  }
  if (process.argv.includes('--plan')) console.log(JSON.stringify(plan, null, 2))
  else if (plan.length) runChecks(plan)
  else console.log('  → No application checks needed for these staged files')
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main() }
  catch (error) { console.error(String(error)); process.exitCode = 1 }
}
