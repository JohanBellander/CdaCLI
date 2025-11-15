import { PrismaClient } from "@prisma/client";

import type { Order, OrdersRepository } from "../domain/order";

const prisma = new PrismaClient();

export class PrismaOrdersRepository implements OrdersRepository {
  async list(): Promise<Order[]> {
    const rows = await prisma.order.findMany({
      select: { id: true, number: true },
    });
    return rows.map((row) => ({ id: row.id, number: row.number }));
  }
}
