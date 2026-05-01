import React, { createContext, useContext } from 'react'
import type { UseDemoStreamReturn } from '../../debug/hooks/useDemoStream'

const DemoToolsContext = createContext<UseDemoStreamReturn | null>(null)

export function DemoToolsProvider({
  value,
  children,
}: {
  value: UseDemoStreamReturn
  children: React.ReactNode
}) {
  return (
    <DemoToolsContext.Provider value={value}>
      {children}
    </DemoToolsContext.Provider>
  )
}

export function useDemoTools(): UseDemoStreamReturn {
  const v = useContext(DemoToolsContext)
  if (!v) {
    throw new Error('useDemoTools must be used within DemoToolsProvider')
  }
  return v
}
