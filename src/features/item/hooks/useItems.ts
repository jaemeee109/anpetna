import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { itemApi } from "../data/item.api";
import type { CreateItemReq, UpdateItemReq } from "../data/item.types";

export const useItemList = (page=1, size=20, q?: string) =>
  useQuery({
    queryKey: ["item","list", page, size, q ?? ""],
    queryFn: () => q ? itemApi.search(q, page, size) : itemApi.list({ page, size }),
  });

export const useItemDetail = (itemId: number) =>
  useQuery({
    queryKey: ["item","detail", itemId],
    queryFn: () => itemApi.detail(itemId),
    enabled: typeof itemId === "number",
  });

export const useCreateItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateItemReq) => itemApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item","list"] });
    },
  });
};

export const useUpdateItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateItemReq) => itemApi.update(body),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["item","detail", vars.itemId] });
      qc.invalidateQueries({ queryKey: ["item","list"] });
    },
  });
};

export const useRemoveItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => itemApi.remove(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item","list"] });
    },
  });
};
