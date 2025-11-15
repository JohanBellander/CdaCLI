import { useQuery } from "@tanstack/react-query";
import type { OrdersResponse } from "@shared-types/orders";
import { apiClient } from "../../../lib/apiClient";

export function useOrdersQuery() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const response = await apiClient.get<OrdersResponse>("/orders");
      return response.data.orders;
    },
  });
}
