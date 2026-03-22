import { useState } from 'react';
import { Badge, Button, Modal, SectionHeader } from '../../../components/ui';
import { ProjectBoard } from '../components/ProjectBoard';
import { ProjectForm } from '../components/ProjectForm';
import { ProjectsOverview } from '../components/ProjectsOverview';
import { useProjects } from '../hooks/useProjects';

export function ProjectsPage() {
  const { projects, addProject, updateStatus } = useProjects();
  const [open, setOpen] = useState(false);

  const summary = {
    total: projects.length,
    active: projects.filter((project) => project.status === 'In Progress').length,
    blocked: projects.filter((project) => project.status === 'Blocked').length,
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module"
        title="Projects"
        description="Run your personal and professional projects through a lightweight board."
        actions={
          <>
            <Badge variant="info">Persistent</Badge>
            <Button onClick={() => setOpen(true)}>Add Project</Button>
          </>
        }
      />

      <ProjectsOverview summary={summary} />

      <ProjectBoard projects={projects} onStatusChange={updateStatus} />

      <Modal title="Create Project" open={open} onClose={() => setOpen(false)}>
        <ProjectForm
          onSubmit={(project) => {
            void addProject(project);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}
