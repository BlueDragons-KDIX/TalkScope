import type { LayoutNode } from '../../domain/entities/Layout'

const isLayoutNode = (value: unknown): value is LayoutNode => {
  if (!value || typeof value !== 'object') return false

  const node = value as Partial<LayoutNode>
  if (node.type === 'leaf') {
    return typeof node.id === 'string' && typeof node.windowId === 'string'
  }
  if (node.type === 'split') {
    return (
      typeof node.id === 'string' &&
      (node.direction === 'h' || node.direction === 'v') &&
      typeof node.ratio === 'number' &&
      isLayoutNode(node.a) &&
      isLayoutNode(node.b)
    )
  }
  return false
}

const extractReturnedObject = (source: string): string | null => {
  const returnIndex = source.indexOf('return')
  const searchStart = returnIndex >= 0 ? returnIndex : 0
  const objectStart = source.indexOf('{', searchStart)
  if (objectStart < 0) return null

  let depth = 0
  let inString: '"' | null = null
  let escaped = false

  for (let i = objectStart; i < source.length; i += 1) {
    const char = source[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === inString) {
        inString = null
      }
      continue
    }

    if (char === '"') {
      inString = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(objectStart, i + 1)
    }
  }

  return null
}

export const parseLayoutTemplateText = (source: string): LayoutNode => {
  const objectText = extractReturnedObject(source.trim())
  if (!objectText) {
    throw new Error('レイアウト情報のオブジェクトが見つかりません')
  }

  const parsed: unknown = JSON.parse(objectText)
  if (!isLayoutNode(parsed)) {
    throw new Error('LayoutNode の形式ではありません')
  }
  return parsed
}

const toPascalCase = (value: string): string =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('')

export const formatLayoutTemplateMethod = (phaseId: string, layout: LayoutNode): string =>
  `// ScriptableLayoutTemplates.templates() に以下を追加:
// this.template('表示名を変更', this.create${toPascalCase(phaseId)}SampleLayout()),

create${toPascalCase(phaseId)}SampleLayout(): LayoutNode {
  return ${JSON.stringify(layout, null, 2)}
}`
