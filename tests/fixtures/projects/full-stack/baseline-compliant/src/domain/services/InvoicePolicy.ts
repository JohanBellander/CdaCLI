import type { InvoiceRecord } from "../ports/InvoicePort";

export function canSubmit(record: InvoiceRecord): boolean {
  return !record.submittedAt;
}
