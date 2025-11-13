import { useState } from "react";
import { InvoiceService } from "../services/InvoiceService";

const service = new InvoiceService();

export function useInvoicePresenter() {
  const [title, setTitle] = useState("Invoice");
  return {
    load(id: string) {
      setTitle(service.describe(id));
      return { title };
    },
    submit(id: string) {
      return service.submit(id);
    },
  } satisfies InvoicePresenter;
}

export interface InvoicePresenter {
  load(id: string): { title: string };
  submit(id: string): Promise<void>;
}
