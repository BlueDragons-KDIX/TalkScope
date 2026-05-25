import '@happy-dom/global-registrator/register'
import { afterEach } from 'bun:test'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
})
