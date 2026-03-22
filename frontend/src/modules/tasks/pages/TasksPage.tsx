import { Badge, Card, SectionHeader } from '../../../components/ui';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import { TasksSnapshotCard } from '../components/TasksSnapshotCard';
import { useTasksData } from '../hooks/useTasksData';
import { useTasksStore } from '../state/useTasksStore';

export function TasksPage() {
  const { tasks, overview } = useTasksData();
  const addTask = useTasksStore((state) => state.addTask);
  const updateTaskStatus = useTasksStore((state) => state.updateTaskStatus);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module"
        title="Tasks"
        description="Capture, schedule, and complete important work in a single queue."
        actions={<Badge variant="info">Local Storage</Badge>}
      />

      <TasksSnapshotCard overview={overview} />

      <Card>
        <h3 className="text-lg font-semibold text-white">Capture Task</h3>
        <div className="mt-4">
          <TaskForm onSubmit={addTask} />
        </div>
      </Card>

      <TaskList tasks={tasks} onStatusChange={updateTaskStatus} />
    </div>
  );
}
