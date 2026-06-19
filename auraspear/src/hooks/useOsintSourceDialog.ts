'use client'

import { useCallback, useMemo, useState } from 'react'
import { type OsintAuthType, OsintSourceType } from '@/enums'
import { deriveOsintSourceState } from '@/lib/ai-config.utils'
import { lookupBuiltinOsintDefaults } from '@/lib/osint.utils'
import type { CreateOsintSourceInput, OsintSourceConfig, UpdateOsintSourceInput } from '@/types'

export function useOsintSourceDialog(
  source: OsintSourceConfig | null,
  open: boolean,
  onSubmit: (data: CreateOsintSourceInput | UpdateOsintSourceInput) => void
) {
  const isEdit = Boolean(source)
  const initial = useMemo(() => deriveOsintSourceState(source), [source])

  const [sourceType, setSourceTypeRaw] = useState<OsintSourceType>(initial.sourceType)
  const [name, setName] = useState(initial.name)
  const [isEnabled, setIsEnabled] = useState(initial.isEnabled)
  const [apiKey, setApiKey] = useState(initial.apiKey)
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl)
  const [authType, setAuthType] = useState<OsintAuthType>(initial.authType)
  const [headerName, setHeaderName] = useState(initial.headerName)
  const [queryParam, setQueryParam] = useState(initial.queryParam)
  const [responsePath, setResponsePath] = useState(initial.responsePath)
  const [requestMethod, setRequestMethod] = useState(initial.requestMethod)
  const [timeout, setTimeout_] = useState(initial.timeout)

  const applyBuiltinDefaults = useCallback((newType: OsintSourceType) => {
    const defaults = lookupBuiltinOsintDefaults(newType)
    if (defaults) {
      setBaseUrl(defaults.baseUrl)
      setAuthType(defaults.authType as OsintAuthType)
      setHeaderName(defaults.headerName)
      setQueryParam(defaults.queryParamName)
      setResponsePath(defaults.responsePath)
      setRequestMethod(defaults.requestMethod)
    }
  }, [])

  const handleSourceTypeChange = useCallback(
    (newType: OsintSourceType) => {
      setSourceTypeRaw(newType)
      if (!isEdit && newType !== OsintSourceType.CUSTOM) {
        applyBuiltinDefaults(newType)
      }
    },
    [isEdit, applyBuiltinDefaults]
  )

  const resetToSource = useCallback(() => {
    const next = deriveOsintSourceState(open ? source : null)
    setSourceTypeRaw(next.sourceType)
    setName(next.name)
    setIsEnabled(next.isEnabled)
    setApiKey(next.apiKey)
    setBaseUrl(next.baseUrl)
    setAuthType(next.authType)
    setHeaderName(next.headerName)
    setQueryParam(next.queryParam)
    setResponsePath(next.responsePath)
    setRequestMethod(next.requestMethod)
    setTimeout_(next.timeout)

    // When creating a new source, auto-populate defaults for the initial type
    if (!source && next.sourceType !== OsintSourceType.CUSTOM) {
      applyBuiltinDefaults(next.sourceType)
    }
  }, [source, open, applyBuiltinDefaults])

  const isCustom = sourceType === OsintSourceType.CUSTOM

  const currentDefaults = useMemo(() => {
    if (sourceType === OsintSourceType.CUSTOM) {
      return null
    }
    return lookupBuiltinOsintDefaults(sourceType) ?? null
  }, [sourceType])

  const handleSubmit = useCallback(() => {
    if (isEdit) {
      const data: UpdateOsintSourceInput = {
        name,
        isEnabled,
        authType,
        timeout: Number.parseInt(timeout, 10),
      }
      if (baseUrl.length > 0) {
        data.baseUrl = baseUrl
      }
      if (headerName.length > 0) {
        data.headerName = headerName
      }
      if (queryParam.length > 0) {
        data.queryParamName = queryParam
      }
      if (responsePath.length > 0) {
        data.responsePath = responsePath
      }
      if (requestMethod.length > 0) {
        data.requestMethod = requestMethod
      }
      if (apiKey.length > 0) {
        data.apiKey = apiKey
      }
      onSubmit(data)
    } else {
      const data: CreateOsintSourceInput = {
        sourceType,
        name,
        isEnabled,
        authType,
        timeout: Number.parseInt(timeout, 10),
      }
      if (apiKey.length > 0) {
        data.apiKey = apiKey
      }
      if (baseUrl.length > 0) {
        data.baseUrl = baseUrl
      }
      if (headerName.length > 0) {
        data.headerName = headerName
      }
      if (queryParam.length > 0) {
        data.queryParamName = queryParam
      }
      if (responsePath.length > 0) {
        data.responsePath = responsePath
      }
      if (requestMethod.length > 0) {
        data.requestMethod = requestMethod
      }
      onSubmit(data)
    }
  }, [
    isEdit,
    sourceType,
    name,
    isEnabled,
    apiKey,
    baseUrl,
    authType,
    headerName,
    queryParam,
    responsePath,
    requestMethod,
    timeout,
    onSubmit,
  ])

  return {
    isEdit,
    isCustom,
    sourceType,
    handleSourceTypeChange,
    currentDefaults,
    name,
    setName,
    isEnabled,
    setIsEnabled,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    authType,
    setAuthType,
    headerName,
    setHeaderName,
    queryParam,
    setQueryParam,
    responsePath,
    setResponsePath,
    requestMethod,
    setRequestMethod,
    timeout,
    setTimeout: setTimeout_,
    handleSubmit,
    resetToSource,
  }
}
