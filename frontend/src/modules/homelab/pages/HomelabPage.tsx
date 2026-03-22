import { Badge, Card, SectionHeader } from '../../../components/ui';
import { HomelabServiceForm } from '../components/HomelabServiceForm';
import { HomelabServicesTable } from '../components/HomelabServicesTable';
import { HomelabStatusCard } from '../components/HomelabStatusCard';
import { useHomelab } from '../hooks/useHomelab';

export function HomelabPage() {
  const { services, overview, addService, updateStatus } = useHomelab();

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
          <HomelabServiceForm
            onSubmit={(service) => {
              void addService(service);
            }}
          />
        </div>
      </Card>

      <HomelabServicesTable services={services} onStatusChange={updateStatus} />
    </div>
  );
}
