import { createElement } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { moduleRoutes } from './moduleRegistry';

export function AppRoutes() {
  return useRoutes([
    {
      path: '/',
      element: createElement(AppShell),
      children: [
        ...moduleRoutes,
        {
          path: '*',
          element: createElement(Navigate, { to: '/', replace: true }),
        },
      ],
    },
  ]);
}
