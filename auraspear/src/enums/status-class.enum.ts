/**
 * Semantic CSS class tokens for status/severity styling.
 * Use these enums instead of literal strings in utility functions.
 */

// ── Text colors ──────────────────────────────────────────────────────────────
export enum StatusTextClass {
  ERROR = 'text-status-error',
  WARNING = 'text-status-warning',
  SUCCESS = 'text-status-success',
  INFO = 'text-status-info',
  NEUTRAL = 'text-status-neutral',
  MUTED = 'text-muted-foreground',
  DESTRUCTIVE = 'text-destructive',
  PRIMARY = 'text-primary',
  WHITE = 'text-white',
}

// ── Background colors ────────────────────────────────────────────────────────
export enum StatusBgClass {
  ERROR = 'bg-status-error',
  WARNING = 'bg-status-warning',
  SUCCESS = 'bg-status-success',
  INFO = 'bg-status-info',
  NEUTRAL = 'bg-status-neutral',
  MUTED = 'bg-muted',
  DESTRUCTIVE_10 = 'bg-destructive/10',
  PRIMARY_10 = 'bg-primary/10',
  ERROR_10 = 'bg-status-error/10',
  WARNING_10 = 'bg-status-warning/10',
  SUCCESS_10 = 'bg-status-success/10',
}

// ── Border colors ────────────────────────────────────────────────────────────
export enum StatusBorderClass {
  ERROR = 'border-status-error',
  WARNING = 'border-status-warning',
  SUCCESS = 'border-status-success',
  INFO = 'border-status-info',
  NEUTRAL = 'border-status-neutral',
  BORDER = 'border-border',
  ERROR_30 = 'border-status-error/30',
  WARNING_30 = 'border-status-warning/30',
  SUCCESS_30 = 'border-status-success/30',
  INFO_30 = 'border-status-info/30',
}
