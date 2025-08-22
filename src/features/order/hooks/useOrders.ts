import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "../data/order.api";
import type { CreateOrderReq } from "../data/order.types";

export const useMyOrders = (page=1, size=10) =>
  useQuery({
    queryKey: ["orders","me", page, size],
    queryFn: () => orderApi.listMe({ page, size }),
  });

export const useOrdersByMemberId = (memberId: string, page=1, size=10) =>
  useQuery({
    queryKey: ["orders","member", memberId, page, size],
    queryFn: () => orderApi.listByMemberId(memberId, { page, size }),
    enabled: !!memberId,
  });

export const useOrderDetail = (ordersId: number) =>
  useQuery({
    queryKey: ["orders","detail", ordersId],
    queryFn: () => orderApi.detail(ordersId),
    enabled: typeof ordersId === "number",
  });

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrderReq) => orderApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders","me"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};

export const useCancelOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ordersId: number) => orderApi.cancel(ordersId),
    onSuccess: (_res, ordersId) => {
      qc.invalidateQueries({ queryKey: ["orders","detail", ordersId] });
      qc.invalidateQueries({ queryKey: ["orders","me"] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ordersId, status }: { ordersId: number; status: string }) =>
      orderApi.updateStatus(ordersId, status),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["orders","detail", vars.ordersId] });
      qc.invalidateQueries({ queryKey: ["orders","member"] });
    },
  });
};

export const useOrdersSummaryByMember = (memberId: string, page=1, size=10) =>
  useQuery({
    queryKey: ["orders","summary", memberId, page, size],
    queryFn: () => orderApi.summaryByMember(memberId, { page, size }),
    enabled: !!memberId,
  });
