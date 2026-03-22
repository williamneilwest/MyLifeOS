export interface QuickAction {
  id: string;
  label: string;
  description: string;
  route: string;
}

export const quickActions: QuickAction[] = [
  { id: 'qa-finance', label: 'Add Finance Entry', description: 'Log income, expense, or savings activity', route: '/finance' },
  { id: 'qa-task', label: 'Capture Task', description: 'Add a new priority task to your queue', route: '/tasks' },
  { id: 'qa-project', label: 'Create Project', description: 'Start tracking a new project item', route: '/projects' },
  { id: 'qa-plan', label: 'Update Goal', description: 'Check in on a planning goal', route: '/planning' },
];

export const userProfile = {
  name: 'Will',
  workspace: 'Personal Workspace',
};
