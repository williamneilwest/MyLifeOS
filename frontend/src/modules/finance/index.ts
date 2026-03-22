import { createElement, lazy, Suspense } from 'react';
import { Wallet } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const FinancePage = lazy(() => import('./pages/FinancePage').then((module) => ({ default: module.FinancePage })));

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
        createElement(FinancePage),
      ),
    },
  ],
};

export { FinancePage } from './pages/FinancePage';
