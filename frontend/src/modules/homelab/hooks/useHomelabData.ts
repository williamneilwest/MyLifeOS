import { useMemo } from 'react';
import { useHomelabStore } from '../state/useHomelabStore';

export function useHomelabData() {
  const services = useHomelabStore((state) => state.services);

  const overview = useMemo(
    () => ({
      totalServices: services.length,
      healthyServices: services.filter((service) => service.status === 'healthy').length,
      degradedServices: services.filter((service) => service.status === 'degraded').length,
      offlineServices: services.filter((service) => service.status === 'offline').length,
    }),
    [services],
  );

  return {
    services,
    overview,
  };
}
