import { createElement, lazy, Suspense } from 'react';
import { Database } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const DatabaseViewerPage = lazy(() => import('../../pages/DatabaseViewer').then((module) => ({ default: module.DatabaseViewer })));

export const databaseModule: LifeOsModule = {
  id: 'database',
  nav: {
    id: 'database',
    label: 'Database',
    path: '/database',
    icon: Database,
  },
  routes: [
    {
      path: 'database',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading database viewer...') },
        createElement(DatabaseViewerPage),
      ),
    },
  ],
};

