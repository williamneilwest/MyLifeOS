import { createElement, lazy, Suspense } from 'react';
import { Bot } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const AIBuilderPage = lazy(() => import('./pages/AIBuilderPage').then((module) => ({ default: module.AIBuilderPage })));

export const aiBuilderModule: LifeOsModule = {
  id: 'ai-builder',
  nav: {
    id: 'ai-builder',
    label: 'AI Builder',
    path: '/ai-builder',
    icon: Bot,
  },
  routes: [
    {
      path: 'ai-builder',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading AI Builder...') },
        createElement(AIBuilderPage),
      ),
    },
  ],
};

export { AIBuilderPage } from './pages/AIBuilderPage';
