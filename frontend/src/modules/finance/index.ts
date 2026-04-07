import { createElement, lazy, Suspense, type ComponentType } from 'react';
import { Wallet } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import type { LifeOsModule } from '../../routes/moduleTypes';
import { FINANCE_OWNER_USERNAME, useAuthStore } from '../../store/useAuthStore';

const FinancePage = lazy(() => import('./pages/FinanceControlCenterPage').then((module) => ({ default: module.FinancePage })));
const IncomePage = lazy(() => import('./pages/IncomePage').then((module) => ({ default: module.IncomePage })));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then((module) => ({ default: module.ExpensesPage })));
const SavingsPage = lazy(() => import('./pages/SavingsPage').then((module) => ({ default: module.SavingsPage })));
const DebtPage = lazy(() => import('./pages/DebtPage').then((module) => ({ default: module.DebtPage })));

interface FinanceAccessGateProps {
  component: ComponentType;
}

function FinanceAccessGate({ component: Component }: FinanceAccessGateProps) {
  const checked = useAuthStore((state) => state.checked);
  const user = useAuthStore((state) => state.user);

  if (!checked) {
    return createElement('div', { className: 'text-sm text-slate-400' }, 'Checking access...');
  }

  const isOwner = user?.username?.trim().toLowerCase() === FINANCE_OWNER_USERNAME;
  if (!isOwner) {
    return createElement(Navigate, { to: '/', replace: true });
  }

  return createElement(Component);
}

function protectedElement(component: ComponentType, fallbackLabel: string) {
  return createElement(
    Suspense,
    { fallback: createElement('div', { className: 'text-sm text-slate-400' }, fallbackLabel) },
    createElement(FinanceAccessGate, { component }),
  );
}

export const financeModule: LifeOsModule = {
  id: 'finance',
  nav: {
    id: 'finance',
    label: 'Finance',
    path: '/finance',
    icon: Wallet,
  },
  routes: [
    {
      path: 'finance',
      element: protectedElement(FinancePage, 'Loading finance...'),
    },
    {
      path: 'finance/income',
      element: protectedElement(IncomePage, 'Loading income dashboard...'),
    },
    {
      path: 'finance/expenses',
      element: protectedElement(ExpensesPage, 'Loading expense dashboard...'),
    },
    {
      path: 'finance/savings',
      element: protectedElement(SavingsPage, 'Loading savings dashboard...'),
    },
    {
      path: 'finance/debt',
      element: protectedElement(DebtPage, 'Loading debt dashboard...'),
    },
  ],
};

export { FinancePage } from './pages/FinanceControlCenterPage';
