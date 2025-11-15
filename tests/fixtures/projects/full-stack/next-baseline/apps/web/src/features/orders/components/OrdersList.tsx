import { useOrdersQuery } from "../hooks/useOrdersQuery";

export default function OrdersList() {
  const { data, isLoading } = useOrdersQuery();
  if (isLoading) {
    return <p>Loading orders…</p>;
  }

  return (
    <ul>
      {data?.map((order) => (
        <li key={order.id}>{order.number}</li>
      ))}
    </ul>
  );
}
