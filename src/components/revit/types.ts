export interface SectionSummary {
  code: string;
  description: string;
  chapter_code: string;
  chapter_name: string;
  quantity: number | null;
  unit: string;
  fuente: string;
  element_count: number;
  has_data: boolean;
}

export interface ChapterStats {
  name: string;
  with_data: number;
  without_data: number;
  total: number;
  pct: number;
}

export interface TopSection {
  code: string;
  description: string;
  quantity: number;
}

export interface WarningItem {
  code: string;
  level: 'error' | 'warning' | 'info';
  section_code: string | null;
  message: string;
}

export interface AnalysisResponse {
  job_id: string;
  filename: string;
  total_sections: number;
  with_data: number;
  without_data: number;
  pct_modeled: number;
  totals_by_unit: Record<string, number>;
  summaries: SectionSummary[];
  chapter_stats: Record<string, ChapterStats>;
  top_area: TopSection[];
  warnings: WarningItem[];
}
