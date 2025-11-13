export interface InvoicePort {
  fetch(id: string): InvoiceRecord;
  persist(record: InvoiceRecord): Promise<void> | void;
}

export interface InvoiceRecord {
  id: string;
  summary: string;
  submittedAt?: string;
}
