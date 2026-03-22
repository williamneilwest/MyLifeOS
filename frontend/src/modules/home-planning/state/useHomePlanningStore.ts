import { create } from 'zustand';
import { defaultHomePlanInput } from '../../../data/sampleData';
import { createLocalStorageRepository } from '../../../services/storage/localStorageRepository';
import type { HomePlanInput } from '../../../types';

const repository = createLocalStorageRepository<HomePlanInput>('life-os-home-plan', defaultHomePlanInput);

interface HomePlanningState {
  input: HomePlanInput;
  updateInput: (patch: Partial<HomePlanInput>) => void;
}

export const useHomePlanningStore = create<HomePlanningState>((set) => ({
  input: repository.get(),
  updateInput: (patch) =>
    set((state) => {
      const input = { ...state.input, ...patch };
      repository.save(input);
      return { input };
    }),
}));
