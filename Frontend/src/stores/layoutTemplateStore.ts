import { create } from 'zustand'
import type { LayoutNode } from '../domain/entities/Layout'
import type { PresentationSnapshot } from '../presentation/layout/presentationSnapshot'
import { capturePresentationSnapshot } from '../presentation/layout/presentationSnapshot'

export interface LayoutTemplate {
  id: string
  name: string
  layout: LayoutNode
  /** レイアウト以外のプレゼン設定（旧データは undefined） */
  snapshot?: PresentationSnapshot
}

export const MAX_ORIGINAL_LAYOUT_TEMPLATES = 5

interface LayoutTemplateState {
  templates: LayoutTemplate[]
  addTemplate: (name: string, snapshot: PresentationSnapshot) => LayoutTemplate
  removeTemplate: (id: string) => void
}

const STORAGE_KEY = 'talkscope:original-layout-templates'

const createTemplateId = (): string =>
  `layout-template-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

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

const normalizeStoredTemplate = (raw: unknown): LayoutTemplate | null => {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Partial<LayoutTemplate>
  if (typeof item.id !== 'string' || typeof item.name !== 'string' || !isLayoutNode(item.layout)) {
    return null
  }
  return {
    id: item.id,
    name: item.name,
    layout: item.layout,
    snapshot: item.snapshot,
  }
}

const loadTemplates = (): LayoutTemplate[] => {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeStoredTemplate)
      .filter((template): template is LayoutTemplate => template !== null)
  } catch {
    return []
  }
}

const saveTemplates = (templates: LayoutTemplate[]): void => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export const useLayoutTemplateStore = create<LayoutTemplateState>((set, get) => ({
  templates: loadTemplates(),

  addTemplate: (name, snapshot) => {
    if (get().templates.length >= MAX_ORIGINAL_LAYOUT_TEMPLATES) {
      throw new Error(`オリジナルレイアウトは最大${MAX_ORIGINAL_LAYOUT_TEMPLATES}個まで保存できます`)
    }

    const template: LayoutTemplate = {
      id: createTemplateId(),
      name: name.trim(),
      layout: JSON.parse(JSON.stringify(snapshot.layout)) as LayoutNode,
      snapshot: JSON.parse(JSON.stringify(snapshot)) as PresentationSnapshot,
    }
    const templates = [...get().templates, template]
    saveTemplates(templates)
    set({ templates })
    return template
  },

  removeTemplate: (id) => {
    const templates = get().templates.filter(template => template.id !== id)
    saveTemplates(templates)
    set({ templates })
  },
}))

/** 現在状態からオリジナル保存用スナップショットを生成 */
export function buildOriginalLayoutTemplateSnapshot(
  phaseId: string,
  layout: LayoutNode,
): PresentationSnapshot {
  return capturePresentationSnapshot(phaseId, layout)
}
