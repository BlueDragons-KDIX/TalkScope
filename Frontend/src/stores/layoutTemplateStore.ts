import { create } from 'zustand'
import type { LayoutNode } from '../domain/entities/Layout'

export interface LayoutTemplate {
  id: string
  name: string
  layout: LayoutNode
}

interface LayoutTemplateState {
  templates: LayoutTemplate[]
  addTemplate: (name: string, layout: LayoutNode) => LayoutTemplate
  removeTemplate: (id: string) => void
}

const STORAGE_KEY = 'talkscope:layout-templates'

const createTemplateId = (): string =>
  `layout-template-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const loadTemplates = (): LayoutTemplate[] => {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
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

  addTemplate: (name, layout) => {
    const template: LayoutTemplate = {
      id: createTemplateId(),
      name: name.trim(),
      layout,
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
