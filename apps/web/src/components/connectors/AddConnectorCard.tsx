'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useAddConnectorCard } from '@/hooks'
import { CONNECTOR_ICONS, CONNECTOR_META } from '@/lib/constants/connectors.constants'
import { lookup } from '@/lib/utils'
import type { AddConnectorCardProps } from '@/types'

export function AddConnectorCard({ connectorType }: AddConnectorCardProps) {
  const { router, t, canAdd } = useAddConnectorCard()

  if (!canAdd) {
    return null
  }

  const iconComponent = lookup(CONNECTOR_ICONS, connectorType)
  const meta = lookup(CONNECTOR_META, connectorType)

  return (
    <Card className="border-dashed opacity-60 transition-opacity hover:opacity-100">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
            {React.createElement(iconComponent, { className: 'text-muted-foreground h-5 w-5' })}
          </div>
          <div>
            <CardTitle className="text-base">{meta.label}</CardTitle>
            <CardDescription>{t(meta.descriptionKey)}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/connectors/${connectorType}?create=true`)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          {t('addConnector')}
        </Button>
      </CardContent>
    </Card>
  )
}
