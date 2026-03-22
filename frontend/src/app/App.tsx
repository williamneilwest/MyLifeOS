import { RouterProvider } from 'react-router-dom';
import { useThemeSetup } from '../hooks/useThemeSetup';
import { appRouter } from '../routes/router';

export default function App() {
  useThemeSetup();

  return <RouterProvider router={appRouter} />;
}
