import type { FastifyInstance } from "fastify";

import { listOrders } from "./usecases/listOrders";
import { PrismaOrdersRepository } from "./infra/prismaOrdersRepository";
import { OrdersResponseSchema } from "@shared-types/orders";

export async function registerOrderRoutes(app: FastifyInstance) {
  app.get("/orders", async () => {
    const repo = new PrismaOrdersRepository();
    const orders = await listOrders(repo);
    return OrdersResponseSchema.parse({ orders });
  });
}
