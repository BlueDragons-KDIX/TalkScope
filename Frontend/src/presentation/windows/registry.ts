import type { IWindowDefinition } from './IWindowDefinition'
import { SYSTEM_CONTROL_WINDOW_ID } from '../constants/systemControlWindow'

const registry = new Map<string, IWindowDefinition>()

export function registerWindow(def: IWindowDefinition): void {
  registry.set(def.id, def)
}

export function getWindowDefinition(id: string): IWindowDefinition | undefined {
  return registry.get(id)
}

export function getAllWindowIds(): string[] {
  return [...registry.keys()]
}

/** レイアウト選択 UI 用（操作ウィンドウ除く・ラベル昇順） */
export function getLayoutSelectableWindows(): IWindowDefinition[] {
  return [...registry.values()]
    .filter(d => d.id !== SYSTEM_CONTROL_WINDOW_ID)
    .sort((a, b) => a.label.localeCompare(b.label, 'ja'))
}
