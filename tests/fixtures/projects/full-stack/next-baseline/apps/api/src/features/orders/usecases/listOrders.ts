import type { OrdersRepository } from "../domain/order";
import { toOrderSummary } from "../domain/order";

export async function listOrders(repo: OrdersRepository) {
  const records = await repo.list();
  return records.map(toOrderSummary);
}
