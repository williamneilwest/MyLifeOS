import { create } from 'zustand';
import { createLocalStorageRepository } from '../../../services/storage/localStorageRepository';
import type { HomelabHealth, HomelabServiceItem } from '../types';

const defaultServices: HomelabServiceItem[] = [
  { id: 'svc-1', name: 'Plex', endpoint: 'https://plex.local', status: 'healthy', uptimeDays: 44 },
  { id: 'svc-2', name: 'Portainer', endpoint: 'https://portainer.local', status: 'healthy', uptimeDays: 62 },
  { id: 'svc-3', name: 'Grafana', endpoint: 'https://grafana.local', status: 'degraded', uptimeDays: 12 },
  { id: 'svc-4', name: 'Gitea Runner', endpoint: 'https://runner.local', status: 'offline', uptimeDays: 0 },
];

const repository = createLocalStorageRepository<HomelabServiceItem[]>('life-os-homelab', defaultServices);

interface HomelabState {
  services: HomelabServiceItem[];
  addService: (service: HomelabServiceItem) => void;
  updateStatus: (id: string, status: HomelabHealth) => void;
}

export const useHomelabStore = create<HomelabState>((set) => ({
  services: repository.get(),
  addService: (service) =>
    set((state) => {
      const services = [service, ...state.services];
      repository.save(services);
      return { services };
    }),
  updateStatus: (id, status) =>
    set((state) => {
      const services = state.services.map((service) => (service.id === id ? { ...service, status } : service));
      repository.save(services);
      return { services };
    }),
}));
