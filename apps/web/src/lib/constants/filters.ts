/**
 * Sentinel value for "all" in Select filter dropdowns.
 * shadcn Select does not support empty string values, so we use this placeholder
 * and convert to/from empty string in the filter handlers.
 */
export const ALL_FILTER = '__all__'
