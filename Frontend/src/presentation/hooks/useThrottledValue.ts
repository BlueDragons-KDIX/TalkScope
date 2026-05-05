import { useEffect, useRef, useState } from 'react'

export function useThrottledValue<T>(value: T, delayMs: number): T {
  const [throttled, setThrottled] = useState(value)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRef = useRef(0)

  useEffect(() => {
    const now = Date.now()
    const elapsed = now - lastRef.current

    if (elapsed >= delayMs) {
      lastRef.current = now
      setThrottled(value)
      return
    }

    const rest = delayMs - elapsed
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      lastRef.current = Date.now()
      setThrottled(value)
    }, rest)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [value, delayMs])

  return throttled
}
