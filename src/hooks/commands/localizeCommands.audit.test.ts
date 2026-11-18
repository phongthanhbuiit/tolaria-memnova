import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { localizeCommandActions } from './localizeCommands'
import type { CommandAction } from './types'

describe('Command Palette labels', () => {
  it('localizes every static label in the command registries', () => {
    const directory = join(process.cwd(), 'src/hooks/commands')
    const commands: CommandAction[] = []
    for (const file of readdirSync(directory).filter(name => name.endsWith('Commands.ts'))) {
      const source = ts.createSourceFile(file, readFileSync(join(directory, file), 'utf8'), ts.ScriptTarget.Latest, true)
      const scan = (node: ts.Node): void => {
        if (ts.isObjectLiteralExpression(node)) {
          const property = (name: string) => node.properties.find(candidate => candidate.name?.getText(source) === name)
          const id = property('id')
          const label = property('label')
          const group = property('group')
          if (id && label && group && ts.isPropertyAssignment(id) && ts.isPropertyAssignment(label) && ts.isPropertyAssignment(group)
            && ts.isStringLiteral(id.initializer) && ts.isStringLiteral(label.initializer) && ts.isStringLiteral(group.initializer)) {
            commands.push({ id: id.initializer.text, label: label.initializer.text, group: group.initializer.text as CommandAction['group'], enabled: true, execute: () => {} })
          }
        }
        ts.forEachChild(node, scan)
      }
      scan(source)
    }
    expect(commands.length).toBeGreaterThan(30)
    const localized = localizeCommandActions(commands, 'vi')
    expect(localized.filter((command, index) => command.label === commands[index].label).map(command => command.id)).toEqual([])
  })
})
