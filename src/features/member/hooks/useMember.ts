import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { memberApi } from "../data/member.api";
import type { LoginReq, UpdateMeReq, SignupReq } from "../data/member.types";

export const useMe = () =>
  useQuery({
    queryKey: ["member","me"],
    queryFn: () => memberApi.me(),
  });

export const useLogin = () =>
  useMutation({
    mutationFn: (body: LoginReq) => memberApi.login(body),
    onSuccess: (res) => {
      if (typeof window !== "undefined" && res?.accessToken) {
        localStorage.setItem("AT", res.accessToken);
      }
    },
  });

export const useLogout = () =>
  useMutation({
    mutationFn: () => memberApi.logout(),
    onSuccess: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("AT");
        window.location.href = "/member/login";
      }
    },
  });

export const useSignup = () =>
  useMutation({
    mutationFn: (body: SignupReq) => memberApi.signup(body),
  });

export const useUpdateMe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeReq) => memberApi.updateMe(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member","me"] });
    },
  });
};
