import { useState } from 'react';
import { Badge, Button, Modal, SectionHeader } from '../../../components/ui';
import { ProjectBoard } from '../components/ProjectBoard';
import { ProjectForm } from '../components/ProjectForm';
import { ProjectsOverview } from '../components/ProjectsOverview';
import { useProjectsStore } from '../state/useProjectsStore';

export function ProjectsPage() {
  const projects = useProjectsStore((state) => state.projects);
  const addProject = useProjectsStore((state) => state.addProject);
  const updateStatus = useProjectsStore((state) => state.updateStatus);
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
            addProject(project);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}
