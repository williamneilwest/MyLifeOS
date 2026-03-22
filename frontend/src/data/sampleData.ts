import type { FinanceEntry, HomePlanInput, HomePlanScenario, ProjectItem } from '../types';

export const sampleProjects: ProjectItem[] = [
  {
    id: 'project-1',
    name: 'Life OS Dashboard',
    status: 'In Progress',
    notes: 'Build the core shell, modular routing, and reusable components.',
    link: 'https://pridebytes.com',
    tags: ['React', 'Dashboard', 'Core'],
    updatedAt: '2026-03-22',
  },
  {
    id: 'project-2',
    name: 'PrideBytes Client Portal',
    status: 'Backlog',
    notes: 'Outline future hosting, invoicing, and client task tracking workflows.',
    tags: ['Business', 'Portal'],
    updatedAt: '2026-03-18',
  },
  {
    id: 'project-3',
    name: 'Home Lab Service Refresh',
    status: 'Complete',
    notes: 'Consolidated Caddy and Docker service structure.',
    tags: ['Homelab', 'Infra'],
    updatedAt: '2026-03-10',
  },
  {
    id: 'project-4',
    name: 'Budget Automation',
    status: 'Blocked',
    notes: 'Waiting on polished import flow for monthly transaction templates.',
    tags: ['Finance', 'Automation'],
    updatedAt: '2026-03-14',
  },
];

export const sampleFinanceEntries: FinanceEntry[] = [
  { id: 'fin-1', name: 'Paycheck', category: 'Salary', amount: 4200, type: 'income', date: '2026-03-01' },
  { id: 'fin-2', name: 'Rent', category: 'Housing', amount: 1650, type: 'expense', date: '2026-03-02' },
  { id: 'fin-3', name: 'Groceries', category: 'Food', amount: 420, type: 'expense', date: '2026-03-04' },
  { id: 'fin-4', name: 'Home Goal Transfer', category: 'Savings Goal', amount: 850, type: 'savings', date: '2026-03-05' },
  { id: 'fin-5', name: 'Utilities', category: 'Bills', amount: 250, type: 'expense', date: '2026-03-06' },
  { id: 'fin-6', name: 'Freelance', category: 'Side Income', amount: 350, type: 'income', date: '2026-03-08' },
];

export const defaultHomePlanInput: HomePlanInput = {
  currentSavings: 18000,
  monthlySavings: 900,
  targetHomePrice: 425000,
  downPaymentPercent: 10,
  interestRate: 6.5,
  monthlyIncome: 5500,
  monthlyExpenses: 2600,
  loanTermYears: 30,
  propertyTaxRate: 0.65,
  insuranceMonthly: 160,
};

export const homePlanScenarios: HomePlanScenario[] = [
  { label: 'Conservative', multiplier: 0.8 },
  { label: 'Moderate', multiplier: 1 },
  { label: 'Aggressive', multiplier: 1.25 },
];
