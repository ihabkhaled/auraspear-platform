'use client'

import { Virtuoso } from 'react-virtuoso'
import type { VirtuosoProps } from 'react-virtuoso'
import type { ReactNode } from 'react'

/**
 * Common wrapper around react-virtuoso's Virtuoso component.
 * Centralizes the library dependency so consumers import from common.
 */
export function VirtualizedList<T>(props: {
  data: T[]
  itemContent: (index: number, item: T) => ReactNode
  overscan?: number
  className?: string
  followOutput?: VirtuosoProps<T, unknown>['followOutput']
  initialTopMostItemIndex?: number
  endReached?: () => void
  startReached?: () => void
  alignToBottom?: boolean
  components?: VirtuosoProps<T, unknown>['components']
}) {
  const virtuosoProps: Record<string, unknown> = {
    data: props.data,
    itemContent: props.itemContent,
    overscan: props.overscan ?? 200,
    className: props.className ?? 'h-full',
  }

  if (props.followOutput !== undefined) virtuosoProps['followOutput'] = props.followOutput
  if (props.initialTopMostItemIndex !== undefined) virtuosoProps['initialTopMostItemIndex'] = props.initialTopMostItemIndex
  if (props.endReached !== undefined) virtuosoProps['endReached'] = props.endReached
  if (props.startReached !== undefined) virtuosoProps['startReached'] = props.startReached
  if (props.alignToBottom !== undefined) virtuosoProps['alignToBottom'] = props.alignToBottom
  if (props.components !== undefined) virtuosoProps['components'] = props.components

  return <Virtuoso {...virtuosoProps as VirtuosoProps<T, unknown>} />
}
