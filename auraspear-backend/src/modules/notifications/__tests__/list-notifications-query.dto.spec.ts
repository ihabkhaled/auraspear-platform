import { ListNotificationsQuerySchema } from '../dto/list-notifications-query.dto'

describe('ListNotificationsQuerySchema', () => {
  /* ---------------------------------------------------------------- */
  /* Defaults                                                          */
  /* ---------------------------------------------------------------- */

  it('applies default values for an empty object', () => {
    const result = ListNotificationsQuerySchema.parse({})

    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.sortBy).toBe('createdAt')
    expect(result.sortOrder).toBe('desc')
    expect(result.query).toBeUndefined()
    expect(result.type).toBeUndefined()
    expect(result.isRead).toBeUndefined()
  })

  /* ---------------------------------------------------------------- */
  /* Custom values                                                     */
  /* ---------------------------------------------------------------- */

  it('accepts valid custom values', () => {
    const result = ListNotificationsQuerySchema.parse({
      page: '3',
      limit: '10',
      sortBy: 'title',
      sortOrder: 'asc',
      query: 'test search',
      type: 'mention',
      isRead: 'true',
    })

    expect(result.page).toBe(3)
    expect(result.limit).toBe(10)
    expect(result.sortBy).toBe('title')
    expect(result.sortOrder).toBe('asc')
    expect(result.query).toBe('test search')
    expect(result.type).toBe('mention')
    expect(result.isRead).toBe('true')
  })

  it('coerces string numbers for page and limit', () => {
    const result = ListNotificationsQuerySchema.parse({ page: '5', limit: '25' })

    expect(result.page).toBe(5)
    expect(result.limit).toBe(25)
  })

  /* ---------------------------------------------------------------- */
  /* Page validation                                                   */
  /* ---------------------------------------------------------------- */

  it('rejects page = 0', () => {
    expect(() => ListNotificationsQuerySchema.parse({ page: '0' })).toThrow()
  })

  it('rejects negative page', () => {
    expect(() => ListNotificationsQuerySchema.parse({ page: '-1' })).toThrow()
  })

  it('accepts page = 1', () => {
    const result = ListNotificationsQuerySchema.parse({ page: '1' })
    expect(result.page).toBe(1)
  })

  it('accepts page = 10000', () => {
    const result = ListNotificationsQuerySchema.parse({ page: '10000' })
    expect(result.page).toBe(10000)
  })

  it('rejects page > 10000', () => {
    expect(() => ListNotificationsQuerySchema.parse({ page: '10001' })).toThrow()
  })

  /* ---------------------------------------------------------------- */
  /* Limit validation                                                  */
  /* ---------------------------------------------------------------- */

  it('rejects limit = 0', () => {
    expect(() => ListNotificationsQuerySchema.parse({ limit: '0' })).toThrow()
  })

  it('rejects limit > 50', () => {
    expect(() => ListNotificationsQuerySchema.parse({ limit: '51' })).toThrow()
  })

  it('accepts limit = 50', () => {
    const result = ListNotificationsQuerySchema.parse({ limit: '50' })
    expect(result.limit).toBe(50)
  })

  it('accepts limit = 1', () => {
    const result = ListNotificationsQuerySchema.parse({ limit: '1' })
    expect(result.limit).toBe(1)
  })

  /* ---------------------------------------------------------------- */
  /* sortBy validation                                                 */
  /* ---------------------------------------------------------------- */

  it('rejects invalid sortBy value', () => {
    expect(() => ListNotificationsQuerySchema.parse({ sortBy: 'invalid' })).toThrow()
  })

  it('accepts all valid sortBy values', () => {
    const validSortFields = ['createdAt', 'type', 'title', 'actorName', 'isRead']
    for (const field of validSortFields) {
      const result = ListNotificationsQuerySchema.parse({ sortBy: field })
      expect(result.sortBy).toBe(field)
    }
  })

  /* ---------------------------------------------------------------- */
  /* sortOrder validation                                              */
  /* ---------------------------------------------------------------- */

  it('rejects invalid sortOrder value', () => {
    expect(() => ListNotificationsQuerySchema.parse({ sortOrder: 'invalid' })).toThrow()
  })

  it('accepts "asc" sortOrder', () => {
    const result = ListNotificationsQuerySchema.parse({ sortOrder: 'asc' })
    expect(result.sortOrder).toBe('asc')
  })

  it('accepts "desc" sortOrder', () => {
    const result = ListNotificationsQuerySchema.parse({ sortOrder: 'desc' })
    expect(result.sortOrder).toBe('desc')
  })

  /* ---------------------------------------------------------------- */
  /* query validation                                                  */
  /* ---------------------------------------------------------------- */

  it('accepts query within max length', () => {
    const result = ListNotificationsQuerySchema.parse({ query: 'a'.repeat(500) })
    expect(result.query).toHaveLength(500)
  })

  it('rejects query exceeding max length', () => {
    expect(() => ListNotificationsQuerySchema.parse({ query: 'a'.repeat(501) })).toThrow()
  })

  it('allows query to be omitted', () => {
    const result = ListNotificationsQuerySchema.parse({})
    expect(result.query).toBeUndefined()
  })

  /* ---------------------------------------------------------------- */
  /* isRead validation                                                 */
  /* ---------------------------------------------------------------- */

  it('accepts isRead "true"', () => {
    const result = ListNotificationsQuerySchema.parse({ isRead: 'true' })
    expect(result.isRead).toBe('true')
  })

  it('accepts isRead "false"', () => {
    const result = ListNotificationsQuerySchema.parse({ isRead: 'false' })
    expect(result.isRead).toBe('false')
  })

  it('rejects invalid isRead value', () => {
    expect(() => ListNotificationsQuerySchema.parse({ isRead: 'yes' })).toThrow()
  })

  it('allows isRead to be omitted', () => {
    const result = ListNotificationsQuerySchema.parse({})
    expect(result.isRead).toBeUndefined()
  })

  /* ---------------------------------------------------------------- */
  /* type validation                                                   */
  /* ---------------------------------------------------------------- */

  it('accepts type within max length', () => {
    const result = ListNotificationsQuerySchema.parse({ type: 'case_assigned' })
    expect(result.type).toBe('case_assigned')
  })

  it('rejects type exceeding max length', () => {
    expect(() => ListNotificationsQuerySchema.parse({ type: 'a'.repeat(51) })).toThrow()
  })

  it('allows type to be omitted', () => {
    const result = ListNotificationsQuerySchema.parse({})
    expect(result.type).toBeUndefined()
  })
})
