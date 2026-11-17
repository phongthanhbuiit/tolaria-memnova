import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('F-006 keeps native form element implementation inside shared ui controls', () => {
  const root = join(process.cwd(), 'src')
  const violations: string[] = []
  function visitDirectory(directory: string) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name)
      if (item.isDirectory()) { if (relative(root, path) !== 'components/ui') visitDirectory(path); continue }
      if (!path.endsWith('.tsx') || /\.test\./.test(path)) continue
      const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      function visit(node: ts.Node) {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ['input', 'button', 'select', 'textarea'].includes(node.tagName.getText(source))) {
          violations.push(`${relative(root, path)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}:${node.tagName.getText(source)}`)
        }
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
  }
  visitDirectory(root)
  expect(violations).toEqual([])
})
