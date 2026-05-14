import React, { createContext, useContext } from 'react'

export type PresentationShellValue = {
  onOpenAppearance: () => void
  onResetAll: () => void
}

const PresentationShellContext = createContext<PresentationShellValue | null>(null)

export function PresentationShellProvider({
  value,
  children,
}: {
  value: PresentationShellValue
  children: React.ReactNode
}) {
  return <PresentationShellContext.Provider value={value}>{children}</PresentationShellContext.Provider>
}

export function usePresentationShell(): PresentationShellValue {
  const v = useContext(PresentationShellContext)
  if (!v) throw new Error('usePresentationShell must be used within PresentationShellProvider')
  return v
}
