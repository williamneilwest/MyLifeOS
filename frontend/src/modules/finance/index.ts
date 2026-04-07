import { createElement, lazy, Suspense } from 'react';
import { Landmark } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then((module) => ({ default: module.TransactionsPage })));

export const financeModule: LifeOsModule = {
  id: 'finance',
  nav: {
    id: 'finance',
    label: 'Finance',
    path: '/finance',
    icon: Landmark,
  },
  routes: [
    {
      path: 'finance',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading finance...') },
        createElement(TransactionsPage),
      ),
    },
  ],
};

export { TransactionsPage } from './pages/TransactionsPage';
