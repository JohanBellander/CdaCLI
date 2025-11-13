import type { InvoicePort, InvoiceRecord } from "../../domain/ports/InvoicePort";

export class InvoiceAdapter implements InvoicePort {
  fetch(id: string): InvoiceRecord {
    return { id, summary: `Invoice ${id}` };
  }

  persist(record: InvoiceRecord): Promise<void> {
    void record;
    return Promise.resolve();
  }
}
