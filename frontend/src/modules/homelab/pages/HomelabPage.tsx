import { Badge, Card, SectionHeader } from '../../../components/ui';
import { HomelabServiceForm } from '../components/HomelabServiceForm';
import { HomelabServicesTable } from '../components/HomelabServicesTable';
import { HomelabStatusCard } from '../components/HomelabStatusCard';
import { useHomelabData } from '../hooks/useHomelabData';
import { useHomelabStore } from '../state/useHomelabStore';

export function HomelabPage() {
  const { services, overview } = useHomelabData();
  const addService = useHomelabStore((state) => state.addService);
  const updateStatus = useHomelabStore((state) => state.updateStatus);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module"
        title="Homelab"
        description="Track service health, uptime, and operational status."
        actions={<Badge variant="info">Persistent</Badge>}
      />

      <HomelabStatusCard overview={overview} />

      <Card>
        <h3 className="text-lg font-semibold text-white">Add Service</h3>
        <div className="mt-4">
          <HomelabServiceForm onSubmit={addService} />
        </div>
      </Card>

      <HomelabServicesTable services={services} onStatusChange={updateStatus} />
    </div>
  );
}
