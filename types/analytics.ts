// Shared analytics types for admin dashboard

export interface OrderAnalyticsDailyStat {
  date: string;
  orders: number;
  revenue: number;
}

export interface OrderAnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusCounts: Record<string, number>;
  dailyStats: OrderAnalyticsDailyStat[];
  servedRevenue: number;
  servedCount: number;
  cancelledCount: number;
  averageServeMinutes: number | null; // average minutes from creation to served (served orders only)
  todayServedCount: number;
  todayServedRevenue: number;
  archivedCount: number;
}

export interface OrdersSummaryOrderRow {
  id?: number;
  table_id?: number;
  status: string;
  total: number;
  created_at?: string; // ISO
  updated_at?: string; // ISO
  daily_number?: number;
  serve_duration_min?: number;
  source?: 'archived' | 'live';
}

export interface OrdersSummaryResponse {
  summary: OrderAnalyticsSummary;
  orders: OrdersSummaryOrderRow[];
  debug?: { sample: OrdersSummaryOrderRow[] };
}
