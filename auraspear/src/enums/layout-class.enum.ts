/**
 * Responsive grid column layout classes.
 * Used by dashboard and other grid-based layouts.
 */
export enum GridColsClass {
  COLS_1 = 'grid-cols-1',
  COLS_1_SM2 = 'grid-cols-1 sm:grid-cols-2',
  COLS_1_SM2_XL3 = 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
  COLS_1_SM2_XL4 = 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
  COLS_1_SM2_LG3_XL5 = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  COLS_1_SM2_LG3_XL6 = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  COLS_1_SM2_LG4_XL7 = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7',
  COLS_1_SM2_LG4_XL8 = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8',
}

/**
 * Gap spacing classes for grid/flex layouts.
 */
export enum GapClass {
  GAP_4 = 'gap-4',
  GAP_6 = 'gap-6',
  GAP_8 = 'gap-8',
}

/**
 * Vertical stack spacing classes.
 */
export enum StackClass {
  SPACE_Y_4 = 'space-y-4',
  SPACE_Y_6 = 'space-y-6',
  SPACE_Y_8 = 'space-y-8',
}
