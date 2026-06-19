import { describe, it, expect } from 'vitest'
import { Permission } from '@/enums/permission.enum'
import { MemoryCategory } from '@/enums/memory.enum'

describe('Permission enum - AI Memory values', () => {
  it('AI_MEMORY_VIEW equals ai.memory.view', () => {
    expect(Permission.AI_MEMORY_VIEW).toBe('ai.memory.view')
  })

  it('AI_MEMORY_EDIT equals ai.memory.edit', () => {
    expect(Permission.AI_MEMORY_EDIT).toBe('ai.memory.edit')
  })

  it('AI_MEMORY_VIEW is a member of Permission enum', () => {
    expect(Object.values(Permission)).toContain('ai.memory.view')
  })

  it('AI_MEMORY_EDIT is a member of Permission enum', () => {
    expect(Object.values(Permission)).toContain('ai.memory.edit')
  })
})

describe('MemoryCategory enum', () => {
  it('has FACT value', () => {
    expect(MemoryCategory.FACT).toBe('fact')
  })

  it('has PREFERENCE value', () => {
    expect(MemoryCategory.PREFERENCE).toBe('preference')
  })

  it('has INSTRUCTION value', () => {
    expect(MemoryCategory.INSTRUCTION).toBe('instruction')
  })

  it('has CONTEXT value', () => {
    expect(MemoryCategory.CONTEXT).toBe('context')
  })

  it('has exactly 4 members', () => {
    const values = Object.values(MemoryCategory)
    expect(values).toHaveLength(4)
  })

  it('contains all expected values', () => {
    const values = Object.values(MemoryCategory)
    expect(values).toEqual(
      expect.arrayContaining(['fact', 'preference', 'instruction', 'context'])
    )
  })
})
