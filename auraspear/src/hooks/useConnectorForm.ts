import { useState, useCallback } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, useWatch } from 'react-hook-form'
import { Toast } from '@/components/common'
import { ConnectorAuthType, LlmMaxTokensParameter, Permission } from '@/enums'
import { useUpdateConnector } from '@/hooks'
import { mapConfigForBackend, recordToFormValues } from '@/lib/connector-utils'
import { CONNECTOR_META } from '@/lib/constants/connectors.constants'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { lookup } from '@/lib/utils'
import { getConnectorSchema, type ConnectorFormValues } from '@/lib/validation/connectors.schema'
import { useAuthStore } from '@/stores'
import type { UseConnectorFormParams } from '@/types'

export function useConnectorForm({
  type,
  connector,
  readOnly,
  onCreateSubmit,
}: UseConnectorFormParams) {
  const t = useTranslations('connectors')
  const tErrors = useTranslations('errors')
  const tValidation = useTranslations('validation')
  const permissions = useAuthStore(s => s.permissions)
  const meta = lookup(CONNECTOR_META, type)
  const updateMutation = useUpdateConnector(type)

  const disabled = readOnly ?? !hasPermission(permissions, Permission.CONNECTORS_UPDATE)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<ConnectorFormValues>({
    resolver: zodResolver(getConnectorSchema(type)),
    defaultValues: connector
      ? recordToFormValues(connector)
      : {
          name: meta.label,
          enabled: false,
          authType: ConnectorAuthType.BASIC,
          baseUrl: '',
          apiKey: '',
          username: '',
          password: '',
          token: '',
          verifyTLS: false,
          timeoutSeconds: 30,
          tags: '',
          notes: '',
          managerUrl: '',
          indexerUrl: '',
          indexerUsername: '',
          indexerPassword: '',
          tenant: '',
          apiUrl: '',
          streamId: '',
          indexSetId: '',
          pipelineId: '',
          orgId: '',
          clientCert: '',
          clientKey: '',
          grafanaUrl: '',
          folderId: '',
          datasourceUid: '',
          org: '',
          bucket: '',
          mispUrl: '',
          mispAuthKey: '',
          webhookUrl: '',
          workflowId: '',
          shuffleApiKey: '',
          modelId: '',
          region: '',
          accessKeyId: '',
          secretAccessKey: '',
          endpoint: '',
          nlHuntingEnabled: false,
          explainableAiEnabled: false,
          auditLoggingEnabled: false,
          llmBaseUrl: '',
          llmApiKey: '',
          defaultModel: '',
          organizationId: '',
          llmTimeout: 30,
          maxTokensParameter: LlmMaxTokensParameter.MAX_TOKENS,
          openclawBaseUrl: '',
          openclawApiKey: '',
          openclawTimeout: 30,
        },
  })

  const authType = useWatch({ control, name: 'authType' })

  const onSubmit = (values: ConnectorFormValues) => {
    if (onCreateSubmit) {
      onCreateSubmit(values)
      return
    }

    const { name, enabled, authType: formAuthType, tags, ...configFields } = values

    const urlKeys = [
      'baseUrl',
      'indexerUrl',
      'managerUrl',
      'apiUrl',
      'grafanaUrl',
      'mispUrl',
      'webhookUrl',
      'llmBaseUrl',
      'openclawBaseUrl',
    ] as const
    const normalizedConfig = { ...configFields }
    for (const key of urlKeys) {
      const val = Reflect.get(normalizedConfig, key) as string | undefined
      if (val) {
        Reflect.set(normalizedConfig, key, val.toLowerCase())
      }
    }

    const cleanedConfig: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(normalizedConfig)) {
      if (val !== '***REDACTED***') {
        Reflect.set(cleanedConfig, key, val)
      }
    }

    const config = mapConfigForBackend(type, {
      ...cleanedConfig,
      authType: formAuthType,
      tags: tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
    })

    updateMutation.mutate(
      { name, enabled, authType: formAuthType, config },
      {
        onSuccess: () => {
          Toast.success(`${meta.label} ${t('configurationSaved')}`)
        },
        onError: buildErrorToastHandler(tErrors),
      }
    )
  }

  const onInvalid = () => {
    Toast.error(tErrors('errors.common.validation'))
  }

  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({})

  const toggleSecret = useCallback((field: string) => {
    setVisibleSecrets(prev => ({ ...prev, [field]: !Reflect.get(prev, field) }))
  }, [])

  const secretSavedLabel = t('secretSaved')

  return {
    t,
    tValidation,
    meta,
    disabled,
    register,
    handleSubmit,
    control,
    watch,
    errors,
    isDirty,
    authType,
    onSubmit,
    onInvalid,
    visibleSecrets,
    toggleSecret,
    secretSavedLabel,
    updateMutation,
    type,
    onCreateSubmit,
  }
}
