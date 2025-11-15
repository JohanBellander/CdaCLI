import { z } from "zod";

export const OrdersResponseSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      number: z.string(),
    }),
  ),
});

export type OrdersResponse = z.infer<typeof OrdersResponseSchema>;
