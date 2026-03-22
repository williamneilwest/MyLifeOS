import { create } from 'zustand';
import { sampleProjects } from '../../../data/sampleData';
import { createLocalStorageRepository } from '../../../services/storage/localStorageRepository';
import type { ProjectItem, ProjectStatus } from '../../../types';

const repository = createLocalStorageRepository<ProjectItem[]>('life-os-projects', sampleProjects);

interface ProjectsState {
  projects: ProjectItem[];
  addProject: (project: ProjectItem) => void;
  updateStatus: (id: string, status: ProjectStatus) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: repository.get(),
  addProject: (project) =>
    set((state) => {
      const projects = [project, ...state.projects];
      repository.save(projects);
      return { projects };
    }),
  updateStatus: (id, status) =>
    set((state) => {
      const projects = state.projects.map((project) => (project.id === id ? { ...project, status, updatedAt: new Date().toISOString() } : project));
      repository.save(projects);
      return { projects };
    }),
}));
