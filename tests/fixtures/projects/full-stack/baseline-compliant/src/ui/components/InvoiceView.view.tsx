import { useInvoicePresenter } from "../../app/presenters/InvoicePresenter";

type Props = { invoiceId: string };

export function InvoiceView({ invoiceId }: Props) {
  const presenter = useInvoicePresenter();
  const state = presenter.load(invoiceId);
  return (
    <section>
      <h1>{state.title}</h1>
      <button onClick={() => presenter.submit(invoiceId)}>Submit</button>
    </section>
  );
}
