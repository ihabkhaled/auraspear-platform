/**
 * Processes items in sequential batches using Promise.allSettled.
 * Each batch runs in parallel, but batches are processed sequentially
 * to avoid overwhelming the database (CLAUDE.md rule 35).
 *
 * Uses recursion instead of a loop to avoid no-await-in-loop lint warnings.
 */
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) {
    return []
  }

  const batch = items.slice(0, batchSize)
  const remaining = items.slice(batchSize)

  const batchResults = await Promise.allSettled(batch.map(item => processor(item)))
  const remainingResults = await processInBatches(remaining, batchSize, processor)

  return [...batchResults, ...remainingResults]
}

/**
 * Processes items in sequential chunks via a single async call per chunk.
 * (e.g., createMany for each chunk)
 *
 * Uses recursion instead of a loop to avoid no-await-in-loop lint warnings.
 */
export async function processChunked<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return []
  }

  const batch = items.slice(0, batchSize)
  const remaining = items.slice(batchSize)

  const result = await processor(batch)
  const remainingResults = await processChunked(remaining, batchSize, processor)

  return [result, ...remainingResults]
}
