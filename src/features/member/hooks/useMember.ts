// features/member/hooks/useMember.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Member, ModifyMemberReq, ReadMemberAllRes, ReadMemberOneRes,
  JoinMemberReq, JoinMemberRes, LoginReq, LoginRes,
} from '../data/member.types';
import {
  listMembers, readMemberOne, modifyMember,
  signup as apiSignup, login as apiLogin, removeMember,
} from '../data/member.api';
import { AuthStore } from '../data/session'; // ✅ AuthStore는 session.ts에서 import

export function useMemberList() {
  const [data, setData] = useState<ReadMemberAllRes>([]);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await listMembers();
        if (alive) setData(res);
      } catch (e) {
        if (alive) setErr(e as Error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { data, loading, error };
}

export function useMyProfile(initialId?: string) {
  const [member, setMember] = useState<ReadMemberOneRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<Error | null>(null);

  const memberId = useMemo(
    () => initialId || AuthStore.memberId() || '',
    [initialId]
  );

  useEffect(() => {
    if (!memberId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await readMemberOne(memberId);
        if (alive) setMember(res);
      } catch (e) {
        if (alive) setErr(e as Error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [memberId]);

  const update = useCallback(async (patch: ModifyMemberReq) => {
    const res = await modifyMember(patch);
    setMember(res);
    return res;
  }, []);

  const remove = useCallback(async () => {
    const res = await removeMember();
    AuthStore.clear();
    return res;
  }, []);

  return { member, loading, error, update, remove, memberId };
}

export function useMemberActions() {
  const signup = useCallback((body: JoinMemberReq): Promise<JoinMemberRes> => {
    return apiSignup(body);
  }, []);

  const login = useCallback(async (body: LoginReq): Promise<LoginRes> => {
    const data = await apiLogin(body);
    return data;
  }, []);

  return { signup, login };
}
