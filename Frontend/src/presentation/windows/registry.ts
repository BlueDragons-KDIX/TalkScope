import type { IWindowDefinition } from './IWindowDefinition'

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
