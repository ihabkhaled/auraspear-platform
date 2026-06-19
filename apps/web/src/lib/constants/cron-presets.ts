import { CronPreset } from '@/enums'

export const CRON_PRESET_EXPRESSION: Record<CronPreset, string> = {
  // Sub-minute
  [CronPreset.EVERY_30_SECONDS]: '*/30 * * * * *',

  // Minutes
  [CronPreset.EVERY_1_MINUTE]: '* * * * *',
  [CronPreset.EVERY_2_MINUTES]: '*/2 * * * *',
  [CronPreset.EVERY_3_MINUTES]: '*/3 * * * *',
  [CronPreset.EVERY_5_MINUTES]: '*/5 * * * *',
  [CronPreset.EVERY_10_MINUTES]: '*/10 * * * *',
  [CronPreset.EVERY_15_MINUTES]: '*/15 * * * *',
  [CronPreset.EVERY_20_MINUTES]: '*/20 * * * *',
  [CronPreset.EVERY_25_MINUTES]: '*/25 * * * *',
  [CronPreset.EVERY_30_MINUTES]: '*/30 * * * *',
  [CronPreset.EVERY_45_MINUTES]: '*/45 * * * *',

  // Hours
  [CronPreset.EVERY_1_HOUR]: '0 * * * *',
  [CronPreset.EVERY_2_HOURS]: '0 */2 * * *',
  [CronPreset.EVERY_3_HOURS]: '0 */3 * * *',
  [CronPreset.EVERY_4_HOURS]: '0 */4 * * *',
  [CronPreset.EVERY_6_HOURS]: '0 */6 * * *',
  [CronPreset.EVERY_8_HOURS]: '0 */8 * * *',
  [CronPreset.EVERY_12_HOURS]: '0 */12 * * *',

  // Daily
  [CronPreset.DAILY_MIDNIGHT]: '0 0 * * *',
  [CronPreset.DAILY_1AM]: '0 1 * * *',
  [CronPreset.DAILY_2AM]: '0 2 * * *',
  [CronPreset.DAILY_3AM]: '0 3 * * *',
  [CronPreset.DAILY_4AM]: '0 4 * * *',
  [CronPreset.DAILY_5AM]: '0 5 * * *',
  [CronPreset.DAILY_6AM]: '0 6 * * *',
  [CronPreset.DAILY_7AM]: '0 7 * * *',
  [CronPreset.DAILY_8AM]: '0 8 * * *',
  [CronPreset.DAILY_9AM]: '0 9 * * *',
  [CronPreset.DAILY_10AM]: '0 10 * * *',
  [CronPreset.DAILY_12PM]: '0 12 * * *',
  [CronPreset.DAILY_2_30AM]: '30 2 * * *',
  [CronPreset.DAILY_6PM]: '0 18 * * *',

  // Weekly
  [CronPreset.WEEKLY_MONDAY_7AM]: '0 7 * * 1',
  [CronPreset.WEEKLY_MONDAY_9AM]: '0 9 * * 1',
  [CronPreset.WEEKLY_FRIDAY_5PM]: '0 17 * * 5',
  [CronPreset.WEEKLY_SUNDAY_MIDNIGHT]: '0 0 * * 0',

  // Monthly
  [CronPreset.MONTHLY_1ST_MIDNIGHT]: '0 0 1 * *',
  [CronPreset.MONTHLY_1ST_9AM]: '0 9 1 * *',
  [CronPreset.MONTHLY_15TH_9AM]: '0 9 15 * *',

  // Custom — empty, user provides their own
  [CronPreset.CUSTOM]: '',
}

export const CRON_PRESET_LABEL_KEY: Record<CronPreset, string> = {
  [CronPreset.EVERY_30_SECONDS]: 'cronPresets.every30Seconds',
  [CronPreset.EVERY_1_MINUTE]: 'cronPresets.every1Minute',
  [CronPreset.EVERY_2_MINUTES]: 'cronPresets.every2Minutes',
  [CronPreset.EVERY_3_MINUTES]: 'cronPresets.every3Minutes',
  [CronPreset.EVERY_5_MINUTES]: 'cronPresets.every5Minutes',
  [CronPreset.EVERY_10_MINUTES]: 'cronPresets.every10Minutes',
  [CronPreset.EVERY_15_MINUTES]: 'cronPresets.every15Minutes',
  [CronPreset.EVERY_20_MINUTES]: 'cronPresets.every20Minutes',
  [CronPreset.EVERY_25_MINUTES]: 'cronPresets.every25Minutes',
  [CronPreset.EVERY_30_MINUTES]: 'cronPresets.every30Minutes',
  [CronPreset.EVERY_45_MINUTES]: 'cronPresets.every45Minutes',
  [CronPreset.EVERY_1_HOUR]: 'cronPresets.every1Hour',
  [CronPreset.EVERY_2_HOURS]: 'cronPresets.every2Hours',
  [CronPreset.EVERY_3_HOURS]: 'cronPresets.every3Hours',
  [CronPreset.EVERY_4_HOURS]: 'cronPresets.every4Hours',
  [CronPreset.EVERY_6_HOURS]: 'cronPresets.every6Hours',
  [CronPreset.EVERY_8_HOURS]: 'cronPresets.every8Hours',
  [CronPreset.EVERY_12_HOURS]: 'cronPresets.every12Hours',
  [CronPreset.DAILY_MIDNIGHT]: 'cronPresets.dailyMidnight',
  [CronPreset.DAILY_1AM]: 'cronPresets.daily1Am',
  [CronPreset.DAILY_2AM]: 'cronPresets.daily2Am',
  [CronPreset.DAILY_3AM]: 'cronPresets.daily3Am',
  [CronPreset.DAILY_4AM]: 'cronPresets.daily4Am',
  [CronPreset.DAILY_5AM]: 'cronPresets.daily5Am',
  [CronPreset.DAILY_6AM]: 'cronPresets.daily6Am',
  [CronPreset.DAILY_7AM]: 'cronPresets.daily7Am',
  [CronPreset.DAILY_8AM]: 'cronPresets.daily8Am',
  [CronPreset.DAILY_9AM]: 'cronPresets.daily9Am',
  [CronPreset.DAILY_10AM]: 'cronPresets.daily10Am',
  [CronPreset.DAILY_12PM]: 'cronPresets.daily12Pm',
  [CronPreset.DAILY_2_30AM]: 'cronPresets.daily230Am',
  [CronPreset.DAILY_6PM]: 'cronPresets.daily6Pm',
  [CronPreset.WEEKLY_MONDAY_7AM]: 'cronPresets.weeklyMonday7Am',
  [CronPreset.WEEKLY_MONDAY_9AM]: 'cronPresets.weeklyMonday9Am',
  [CronPreset.WEEKLY_FRIDAY_5PM]: 'cronPresets.weeklyFriday5Pm',
  [CronPreset.WEEKLY_SUNDAY_MIDNIGHT]: 'cronPresets.weeklySundayMidnight',
  [CronPreset.MONTHLY_1ST_MIDNIGHT]: 'cronPresets.monthly1stMidnight',
  [CronPreset.MONTHLY_1ST_9AM]: 'cronPresets.monthly1st9Am',
  [CronPreset.MONTHLY_15TH_9AM]: 'cronPresets.monthly15th9Am',
  [CronPreset.CUSTOM]: 'cronPresets.custom',
}

/**
 * Grouped presets for rendering in a categorized select dropdown.
 */
export const CRON_PRESET_GROUPS: { labelKey: string; presets: CronPreset[] }[] = [
  {
    labelKey: 'cronPresets.groupSeconds',
    presets: [CronPreset.EVERY_30_SECONDS],
  },
  {
    labelKey: 'cronPresets.groupMinutes',
    presets: [
      CronPreset.EVERY_1_MINUTE,
      CronPreset.EVERY_2_MINUTES,
      CronPreset.EVERY_3_MINUTES,
      CronPreset.EVERY_5_MINUTES,
      CronPreset.EVERY_10_MINUTES,
      CronPreset.EVERY_15_MINUTES,
      CronPreset.EVERY_20_MINUTES,
      CronPreset.EVERY_25_MINUTES,
      CronPreset.EVERY_30_MINUTES,
      CronPreset.EVERY_45_MINUTES,
    ],
  },
  {
    labelKey: 'cronPresets.groupHours',
    presets: [
      CronPreset.EVERY_1_HOUR,
      CronPreset.EVERY_2_HOURS,
      CronPreset.EVERY_3_HOURS,
      CronPreset.EVERY_4_HOURS,
      CronPreset.EVERY_6_HOURS,
      CronPreset.EVERY_8_HOURS,
      CronPreset.EVERY_12_HOURS,
    ],
  },
  {
    labelKey: 'cronPresets.groupDaily',
    presets: [
      CronPreset.DAILY_MIDNIGHT,
      CronPreset.DAILY_1AM,
      CronPreset.DAILY_2AM,
      CronPreset.DAILY_2_30AM,
      CronPreset.DAILY_3AM,
      CronPreset.DAILY_4AM,
      CronPreset.DAILY_5AM,
      CronPreset.DAILY_6AM,
      CronPreset.DAILY_7AM,
      CronPreset.DAILY_8AM,
      CronPreset.DAILY_9AM,
      CronPreset.DAILY_10AM,
      CronPreset.DAILY_12PM,
      CronPreset.DAILY_6PM,
    ],
  },
  {
    labelKey: 'cronPresets.groupWeekly',
    presets: [
      CronPreset.WEEKLY_MONDAY_7AM,
      CronPreset.WEEKLY_MONDAY_9AM,
      CronPreset.WEEKLY_FRIDAY_5PM,
      CronPreset.WEEKLY_SUNDAY_MIDNIGHT,
    ],
  },
  {
    labelKey: 'cronPresets.groupMonthly',
    presets: [
      CronPreset.MONTHLY_1ST_MIDNIGHT,
      CronPreset.MONTHLY_1ST_9AM,
      CronPreset.MONTHLY_15TH_9AM,
    ],
  },
  {
    labelKey: 'cronPresets.groupCustom',
    presets: [CronPreset.CUSTOM],
  },
]
