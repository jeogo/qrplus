import { describe, it, expect } from 'vitest'

// Simulates the dense table smallest-missing-positive allocation.
function allocate(existing: number[], requested?: number): number {
  if (requested && !existing.includes(requested)) return requested
  const used = new Set(existing)
  let n = 1
  while (used.has(n)) n++
  return n
}

describe('dense table allocation', () => {
  it('fills first gap', () => {
    expect(allocate([1,2,4,5])).toBe(3)
  })
  it('appends when no gaps', () => {
    expect(allocate([1,2,3])).toBe(4)
  })
  it('honors free requested number', () => {
    expect(allocate([1,2,3,5], 4)).toBe(4)
  })
  it('falls back when requested taken', () => {
    expect(allocate([1,2,3,4], 3)).toBe(5)
  })
})
