import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { en } from '../en'

const mobile = path.resolve(__dirname, '../../..')
function sources(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(directory, entry.name)
    if (entry.isDirectory()) return ['__tests__', 'i18n'].includes(entry.name) ? [] : sources(name)
    return /\.tsx?$/.test(entry.name) ? [name] : []
  })
}

it('contains an English translation for every literal interface message and preserves interpolation slots', () => {
  const missing: string[] = []
  for (const file of [...sources(path.join(mobile, 'app')), ...sources(path.join(mobile, 'src'))]) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
        const argument = node.arguments[0]
        if (argument && ts.isStringLiteral(argument) && !en[argument.text.trim()]) {
          missing.push(`${path.relative(mobile, file)}: ${argument.text}`)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  expect(missing).toEqual([])
  for (const [source, translated] of Object.entries(en)) {
    expect(translated).not.toMatch(/[А-Яа-яЁё]/)
    expect([...(translated.match(/\{\d+\}/g) ?? [])].sort())
      .toEqual([...(source.match(/\{\d+\}/g) ?? [])].sort())
  }
})
