import { describe, it, expect, vi } from 'vitest'
import { getNotificationColumns } from '@/components/notifications/getNotificationColumns'
import { SortOrder } from '@/enums'
import type { NotificationItem } from '@/types'

vi.mock('lucide-react', () => ({
  CheckCircle2: 'CheckCircle2',
  Circle: 'Circle',
  Clock: 'Clock',
  Bell: 'Bell',
  Building2: 'Building2',
  ClipboardList: 'ClipboardList',
  FileText: 'FileText',
  MessageSquare: 'MessageSquare',
  Pencil: 'Pencil',
  Shield: 'Shield',
  ShieldOff: 'ShieldOff',
  ToggleRight: 'ToggleRight',
  UserCheck: 'UserCheck',
  UserMinus: 'UserMinus',
  UserPlus: 'UserPlus',
  UserX: 'UserX',
}))

const mockT = (key: string) => key

const mockResolveMessage = (message: string) => message

const translations = {
  notifications: mockT,
  common: mockT,
  resolveMessage: mockResolveMessage,
  locale: 'en',
}

describe('getNotificationColumns', () => {
  const columns = getNotificationColumns(translations)

  it('should return exactly 5 columns', () => {
    expect(columns).toHaveLength(5)
  })

  it('should have correct column keys in order', () => {
    const keys = columns.map(col => col.key)
    expect(keys).toEqual(['isRead', 'type', 'title', 'actorName', 'createdAt'])
  })

  it('should set labels from translations', () => {
    expect(columns[0]?.label).toBe('columns.status')
    expect(columns[1]?.label).toBe('columns.type')
    expect(columns[2]?.label).toBe('columns.title')
    expect(columns[3]?.label).toBe('columns.actor')
    expect(columns[4]?.label).toBe('columns.date')
  })

  it('should mark all columns as sortable', () => {
    for (const col of columns) {
      expect(col.sortable).toBe(true)
    }
  })

  it('should set defaultSortOrder DESC on createdAt column', () => {
    const createdAtCol = columns.find(c => c.key === 'createdAt')
    expect(createdAtCol?.defaultSortOrder).toBe(SortOrder.DESC)
  })

  it('should not set defaultSortOrder on non-date columns', () => {
    const nonDateCols = columns.filter(c => c.key !== 'createdAt')
    for (const col of nonDateCols) {
      expect(col.defaultSortOrder).toBeUndefined()
    }
  })

  it('should set className on isRead column', () => {
    const isReadCol = columns.find(c => c.key === 'isRead')
    expect(isReadCol?.className).toBe('w-24')
  })

  it('should set className on type column', () => {
    const typeCol = columns.find(c => c.key === 'type')
    expect(typeCol?.className).toBe('w-40')
  })

  it('should set className on createdAt column', () => {
    const createdAtCol = columns.find(c => c.key === 'createdAt')
    expect(createdAtCol?.className).toBe('w-40')
  })

  it('should have render functions on all columns', () => {
    for (const col of columns) {
      expect(typeof col.render).toBe('function')
    }
  })

  describe('isRead column render', () => {
    const isReadCol = columns.find(c => c.key === 'isRead')
    const mockRow = { id: '1', isRead: false } as NotificationItem

    it('should return a value for read=true', () => {
      const result = isReadCol?.render?.(true, mockRow)
      expect(result).toBeDefined()
    })

    it('should return a value for read=false', () => {
      const result = isReadCol?.render?.(false, mockRow)
      expect(result).toBeDefined()
    })
  })

  describe('type column render', () => {
    const typeCol = columns.find(c => c.key === 'type')
    const mockRow = { id: '1', type: 'mention' } as NotificationItem

    it('should return a value for a known type', () => {
      const result = typeCol?.render?.('mention', mockRow)
      expect(result).toBeDefined()
    })

    it('should return a value for an unknown type', () => {
      const result = typeCol?.render?.('unknown_type', mockRow)
      expect(result).toBeDefined()
    })
  })

  describe('title column render', () => {
    const titleCol = columns.find(c => c.key === 'title')

    it('should return a value with title and message', () => {
      const mockRow = {
        id: '1',
        title: 'Test Title',
        message: 'Test Message',
        isRead: false,
      } as NotificationItem
      const result = titleCol?.render?.('Test Title', mockRow)
      expect(result).toBeDefined()
    })
  })

  describe('actorName column render', () => {
    const actorCol = columns.find(c => c.key === 'actorName')
    const mockRow = { id: '1', actorName: 'John Doe' } as NotificationItem

    it('should return a value', () => {
      const result = actorCol?.render?.('John Doe', mockRow)
      expect(result).toBeDefined()
    })
  })

  describe('createdAt column render', () => {
    const dateCol = columns.find(c => c.key === 'createdAt')
    const mockRow = { id: '1', createdAt: '2025-01-01T00:00:00Z' } as NotificationItem

    it('should return a value', () => {
      const result = dateCol?.render?.('2025-01-01T00:00:00Z', mockRow)
      expect(result).toBeDefined()
    })
  })
})
