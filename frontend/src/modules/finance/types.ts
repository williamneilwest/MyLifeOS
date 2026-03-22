import type { FinancialSummary } from '../../services/lifeOsService';

export interface FinanceInsight extends FinancialSummary {
  monthlyDelta: number;
}
