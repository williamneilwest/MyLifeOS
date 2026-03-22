import { useHomelab } from './useHomelab';

export function useHomelabData() {
  const { services, overview } = useHomelab();

  return {
    services,
    overview,
  };
}
