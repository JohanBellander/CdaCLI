export type Order = {
  id: string;
  number: string;
};

export interface OrdersRepository {
  list(): Promise<Order[]>;
}

export function toOrderSummary(order: Order) {
  return {
    id: order.id,
    number: order.number,
  };
}
