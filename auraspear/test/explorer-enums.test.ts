import { describe, it, expect } from 'vitest'
import { SyncJobStatus, ExplorerConnector } from '@/enums'

describe('SyncJobStatus', () => {
  it('should have all expected statuses', () => {
    expect(SyncJobStatus.RUNNING).toBe('running')
    expect(SyncJobStatus.COMPLETED).toBe('completed')
    expect(SyncJobStatus.FAILED).toBe('failed')
  })

  it('should contain exactly 3 values', () => {
    expect(Object.values(SyncJobStatus)).toHaveLength(3)
  })
})

describe('ExplorerConnector', () => {
  it('should have all expected connector types', () => {
    expect(ExplorerConnector.GRAYLOG).toBe('graylog')
    expect(ExplorerConnector.GRAFANA).toBe('grafana')
    expect(ExplorerConnector.INFLUXDB).toBe('influxdb')
    expect(ExplorerConnector.MISP).toBe('misp')
    expect(ExplorerConnector.VELOCIRAPTOR).toBe('velociraptor')
    expect(ExplorerConnector.SHUFFLE).toBe('shuffle')
    expect(ExplorerConnector.LOGSTASH).toBe('logstash')
  })

  it('should contain exactly 7 connector types', () => {
    expect(Object.values(ExplorerConnector)).toHaveLength(7)
  })

  it('should have unique values', () => {
    const values = Object.values(ExplorerConnector)
    const uniqueValues = new Set(values)
    expect(uniqueValues.size).toBe(values.length)
  })
})
