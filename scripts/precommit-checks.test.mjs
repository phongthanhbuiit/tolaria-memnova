import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planChecks, runChecks } from './precommit-checks.mjs'

const commands = files => planChecks(files).map(check => check.args.join(' '))
test('a leaf frontend change uses related tests without full coverage', () => {
  const plan = commands(['src/lib/learning/scheduler.ts'])
  assert(plan.includes('exec vitest related --run src/lib/learning/scheduler.ts'))
  assert(plan.includes('exec tsc -b'))
  assert(!plan.some(command => command.includes('coverage') || command === 'exec vitest run --silent'))
})
test('global dependencies and shared test setup require the full frontend suite', () => {
  for (const path of ['pnpm-lock.yaml', 'vite.config.ts', 'src/test/setup.ts', 'package.json']) {
    assert(commands([path]).includes('exec vitest run --silent'), path)
  }
})
test('removed frontend modules fall back to full tests', () => {
  assert(planChecks(['src/lib/removed.ts'], { removed: true }).some(check => check.args.join(' ') === 'exec vitest run --silent'))
})
test('learning Rust changes test their module without unrelated frontend tests', () => {
  const plan = planChecks(['src-tauri/src/learning/reviews.rs'])
  assert(plan.some(check => check.command === 'cargo' && check.args.includes('learning::')))
  assert(!plan.some(check => check.args.includes('vitest')))
})
test('IPC changes include frontend tests because import graphs cannot see Tauri strings', () => {
  const plan = commands(['src-tauri/src/commands/learning.rs'])
  assert(plan.includes('exec vitest run --silent'))
  assert(plan.some(command => command.startsWith('test --manifest-path')))
})
test('docs do not trigger application tests, while site changes build documentation', () => {
  assert.deepEqual(planChecks(['docs/ARCHITECTURE.md', 'AGENTS.md']), [])
  assert(commands(['site/guide.md']).includes('docs:build'))
})
test('filenames with spaces remain separate arguments; failure stops subsequent checks', () => {
  const plan=planChecks(['src/lib/a name.ts'])
  assert(plan.find(check=>check.args.includes('related')).args.includes('src/lib/a name.ts'))
  const called=[]
  assert.throws(()=>runChecks(plan, (command,args)=>{called.push({command,args});return {status:1}}), /failed/)
  assert.equal(called.length,1)
})
test('changed browser tests select their file and shared browser fixtures use smoke', () => {
  assert(commands(['tests/integration/memnova-learning.spec.ts']).includes('exec playwright test --config playwright.integration.config.ts tests/integration/memnova-learning.spec.ts'))
  assert(commands(['tests/helpers/fixtureVault.ts']).includes('playwright:smoke'))
})
test('Rust checks do not inherit commit-hook author identity into temporary test repositories', () => {
  const previous = process.env.GIT_AUTHOR_EMAIL
  process.env.GIT_AUTHOR_EMAIL = 'hook-author@example.test'
  try {
    runChecks([{ label: 'Rust', command: 'cargo', args: ['test'] }], (_command, _args, options) => {
      assert.ok(options.env)
      assert.equal(options.env.GIT_AUTHOR_EMAIL, undefined)
      assert.equal(options.env.PATH, process.env.PATH)
      return { status: 0 }
    })
    assert.equal(process.env.GIT_AUTHOR_EMAIL, 'hook-author@example.test')
  } finally {
    if (previous === undefined) delete process.env.GIT_AUTHOR_EMAIL
    else process.env.GIT_AUTHOR_EMAIL = previous
  }
})
