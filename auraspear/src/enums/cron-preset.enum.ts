export enum CronPreset {
  // ── Seconds / Sub-minute ──
  EVERY_30_SECONDS = 'every_30_seconds',

  // ── Minutes ──
  EVERY_1_MINUTE = 'every_1_minute',
  EVERY_2_MINUTES = 'every_2_minutes',
  EVERY_3_MINUTES = 'every_3_minutes',
  EVERY_5_MINUTES = 'every_5_minutes',
  EVERY_10_MINUTES = 'every_10_minutes',
  EVERY_15_MINUTES = 'every_15_minutes',
  EVERY_20_MINUTES = 'every_20_minutes',
  EVERY_25_MINUTES = 'every_25_minutes',
  EVERY_30_MINUTES = 'every_30_minutes',
  EVERY_45_MINUTES = 'every_45_minutes',

  // ── Hours ──
  EVERY_1_HOUR = 'every_1_hour',
  EVERY_2_HOURS = 'every_2_hours',
  EVERY_3_HOURS = 'every_3_hours',
  EVERY_4_HOURS = 'every_4_hours',
  EVERY_6_HOURS = 'every_6_hours',
  EVERY_8_HOURS = 'every_8_hours',
  EVERY_12_HOURS = 'every_12_hours',

  // ── Daily ──
  DAILY_MIDNIGHT = 'daily_midnight',
  DAILY_1AM = 'daily_1am',
  DAILY_2AM = 'daily_2am',
  DAILY_3AM = 'daily_3am',
  DAILY_4AM = 'daily_4am',
  DAILY_5AM = 'daily_5am',
  DAILY_6AM = 'daily_6am',
  DAILY_7AM = 'daily_7am',
  DAILY_8AM = 'daily_8am',
  DAILY_9AM = 'daily_9am',
  DAILY_10AM = 'daily_10am',
  DAILY_12PM = 'daily_12pm',
  DAILY_2_30AM = 'daily_2_30am',
  DAILY_6PM = 'daily_6pm',

  // ── Weekly ──
  WEEKLY_MONDAY_7AM = 'weekly_monday_7am',
  WEEKLY_MONDAY_9AM = 'weekly_monday_9am',
  WEEKLY_FRIDAY_5PM = 'weekly_friday_5pm',
  WEEKLY_SUNDAY_MIDNIGHT = 'weekly_sunday_midnight',

  // ── Monthly ──
  MONTHLY_1ST_MIDNIGHT = 'monthly_1st_midnight',
  MONTHLY_1ST_9AM = 'monthly_1st_9am',
  MONTHLY_15TH_9AM = 'monthly_15th_9am',

  // ── Custom (user types raw cron) ──
  CUSTOM = 'custom',
}
