import { dashboardModule } from '../modules/dashboard';
import { financeModule } from '../modules/finance';
import { projectsModule } from '../modules/projects';
import { homelabModule } from '../modules/homelab';
import { tasksModule } from '../modules/tasks';
import { planningModule } from '../modules/planning';
import { toolsModule } from '../modules/tools';

export const lifeOsModules = [dashboardModule, financeModule, projectsModule, homelabModule, tasksModule, planningModule, toolsModule];

export const moduleNavItems = lifeOsModules.map((module) => module.nav);
export const moduleRoutes = lifeOsModules.flatMap((module) => module.routes);
