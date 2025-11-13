import { type Invoice } from "../../domain/models/Invoice";

export class InvoiceController {
  get(id: string): Invoice {
    return { id, total: 100 };
  }
}
