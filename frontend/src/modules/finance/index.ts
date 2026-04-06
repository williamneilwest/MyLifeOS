import { createElement, lazy, Suspense } from 'react';
import { Wallet } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import type { LifeOsModule } from '../../routes/moduleTypes';
import { FINANCE_OWNER_USERNAME, useAuthStore } from '../../store/useAuthStore';

const FinancePage = lazy(() => import('./pages/FinancePage').then((module) => ({ default: module.FinancePage })));

function FinanceAccessGate() {
  const checked = useAuthStore((state) => state.checked);
  const user = useAuthStore((state) => state.user);

  if (!checked) {
    return createElement('div', { className: 'text-sm text-slate-400' }, 'Checking access...');
  }

  const isOwner = user?.username?.trim().toLowerCase() === FINANCE_OWNER_USERNAME;
  if (!isOwner) {
    return createElement(Navigate, { to: '/', replace: true });
  }

  return createElement(FinancePage);
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
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading finance...') },
        createElement(FinanceAccessGate),
      ),
    },
  ],
};

export { FinancePage } from './pages/FinancePage';
