import { AuditService } from "../../domain/services/AuditService";

const service = new AuditService();

export function AdminPanel() {
  function refresh() {
    void service.rebuildIndex();
  }

  refresh();
  return <div>Admin</div>;
}
