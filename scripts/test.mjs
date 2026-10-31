import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const directory = await mkdtemp(join(tmpdir(), 'sketchbook-tests-'))
try {
  const output = join(directory, 'editor.test.cjs')
  await build({ entryPoints: ['tests/editor.test.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: output })
  // Importing node:test runs its registered tests and preserves individual results.
  const result = spawnSync(process.execPath, [output], { stdio: 'inherit' })
  process.exitCode = result.status ?? 1
} finally {
  await rm(directory, { recursive: true, force: true })
}
