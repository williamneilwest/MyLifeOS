export type ProjectStatus = 'Backlog' | 'In Progress' | 'Blocked' | 'Complete';

export interface ProjectItem {
  id: string;
  name: string;
  status: ProjectStatus;
  notes: string;
  link?: string;
  tags: string[];
  updatedAt: string;
}

export type FinanceEntryType = 'income' | 'expense' | 'savings';

export interface FinanceEntry {
  id: string;
  name: string;
  category: string;
  amount: number;
  type: FinanceEntryType;
  date: string;
}

export interface HomePlanInput {
  currentSavings: number;
  monthlySavings: number;
  targetHomePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  loanTermYears: number;
  propertyTaxRate: number;
  insuranceMonthly: number;
}

export interface HomePlanScenario {
  label: string;
  multiplier: number;
}

export interface HomePlanResult {
  downPaymentRequired: number;
  closingCostsEstimate: number;
  upfrontCashTarget: number;
  fundedPercent: number;
  remainingToGoal: number;
  monthsUntilReady: number;
  estimatedPurchaseDate: string;
  principalAndInterest: number;
  taxesMonthly: number;
  insuranceMonthly: number;
  totalMonthlyPayment: number;
  frontEndRatio: number;
  affordabilityStatus: 'Healthy' | 'Tight' | 'Risky';
}
