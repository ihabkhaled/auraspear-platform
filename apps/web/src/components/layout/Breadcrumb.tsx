'use client'

import React from 'react'
import Link from 'next/link'
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui'
import { useBreadcrumb } from '@/hooks'
import { PATH_LABEL_MAP, SKIP_SEGMENTS } from '@/lib/constants/breadcrumb'

export function LayoutBreadcrumb() {
  const { segments, t } = useBreadcrumb()

  if (segments.length === 0) {
    return null
  }

  return (
    <BreadcrumbRoot>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">{t('layout.home')}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments
          .filter(segment => !SKIP_SEGMENTS.has(segment))
          .map((segment, index, filtered) => {
            const href = `/${segments.slice(0, segments.indexOf(segment) + 1).join('/')}`
            const isLast = index === filtered.length - 1
            const labelKey = Reflect.get(PATH_LABEL_MAP, segment) as string | undefined
            const label = labelKey ? t(labelKey) : segment

            return (
              <React.Fragment key={href}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={href}>{label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            )
          })}
      </BreadcrumbList>
    </BreadcrumbRoot>
  )
}
