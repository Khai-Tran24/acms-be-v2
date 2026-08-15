import { IsIn, IsOptional } from 'class-validator';

export const DASHBOARD_TIMEFRAMES = ['30d', '6m', '12m', 'year'] as const;
export type DashboardTimeframe = (typeof DASHBOARD_TIMEFRAMES)[number];

export class DashboardTrendQueryDto {
  @IsOptional()
  @IsIn(DASHBOARD_TIMEFRAMES)
  timeframe: DashboardTimeframe = '12m';
}
