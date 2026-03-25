import { aiBuilderModule } from '../modules/ai-builder';
import ApiModule from '../modules/api/ApiModule';
import type { ToolModuleType } from '../modules/tools/types';
import { databaseModule } from '../modules/database';
import { dashboardModule } from '../modules/dashboard';
import { financeModule } from '../modules/finance';
import { projectsModule } from '../modules/projects';
import { scriptsModule } from '../modules/scripts';
import { servicesModule } from '../modules/services';
import { homelabModule } from '../modules/homelab';
import { tasksModule } from '../modules/tasks';
import { planningModule } from '../modules/planning';
import { toolsModule } from '../modules/tools';
import { workplaceModule } from '../modules/workplace';
import type { ModuleId } from '../store/useAppStore';

const allModules = [dashboardModule, servicesModule, workplaceModule, scriptsModule, aiBuilderModule, financeModule, projectsModule, homelabModule, tasksModule, planningModule, toolsModule, databaseModule];
const primaryNavIds = new Set(['workplace', 'dashboard', 'tools', 'database']);

export const lifeOsModules = allModules;

function UnsupportedToolModule() {
  return null;
}

// Tool module renderer registry (used by the Tools module for type-driven rendering).
export const toolModuleRegistry: Record<ToolModuleType, unknown> = {
  qr: UnsupportedToolModule,
  shortcut: UnsupportedToolModule,
  api: ApiModule,
  api_tester: UnsupportedToolModule,
  services: UnsupportedToolModule,
};

// Backward-compatible alias for consumers that expect `moduleRegistry`.
export const moduleRegistry = toolModuleRegistry;

export function getModuleNavItems(activeModules: ModuleId[]) {
  return lifeOsModules
    .filter((module) => primaryNavIds.has(module.id))
    .map((module) => module.nav)
    .filter((nav) => activeModules.includes(nav.id));
}
export const moduleRoutes = lifeOsModules.flatMap((module) => module.routes);
