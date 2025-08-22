import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cartApi } from "../data/cart.api";
import type { AddCartReq, UpdateCartReq } from "../data/cart.types";

export const useCart = () =>
  useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.me(),
  });

export const useAddCart = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AddCartReq) => cartApi.add(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
};

export const useUpdateCart = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCartReq) => cartApi.update(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
};

export const useRemoveCartItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cartItemId: number) => cartApi.remove(cartItemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
};

export const useClearCart = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
};
