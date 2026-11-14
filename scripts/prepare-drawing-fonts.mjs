import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sdk = dirname(fileURLToPath(import.meta.resolve('@excalidraw/excalidraw')))
const target = new URL('../public/excalidraw/fonts/', import.meta.url)
mkdirSync(target, { recursive: true })
cpSync(join(sdk, 'fonts'), target, { recursive: true })
