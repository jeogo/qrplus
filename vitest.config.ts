import { defineConfig } from 'vitest/config'
import tsconfig from './tsconfig.json'

// Derive path aliases from tsconfig "paths" if present
const alias: Record<string,string> = { '@': new URL('./', import.meta.url).pathname }

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  },
  resolve: { alias }
})
