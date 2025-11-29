import React, { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Custom render function with providers
const AllTheProviders = ({ children }: { children: ReactNode }) => {
  return (
    <>
      {children}
    </>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }