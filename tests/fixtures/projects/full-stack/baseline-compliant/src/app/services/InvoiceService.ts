import { InvoicePort } from "../../domain/ports/InvoicePort";
import { InvoiceAdapter } from "../../infra/adapters/InvoiceAdapter";

const adapter: InvoicePort = new InvoiceAdapter();

export class InvoiceService {
  describe(id: string): string {
    const entity = adapter.fetch(id);
    return entity.summary;
  }

  async submit(id: string): Promise<void> {
    const entity = adapter.fetch(id);
    await adapter.persist({ ...entity, submittedAt: new Date().toISOString() });
  }
}
