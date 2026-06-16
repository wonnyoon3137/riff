"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import type { ArtistSummary } from "@/domain/types";

const FOLLOWS_KEY = ["follows"] as const;

interface FollowsListResponse {
  artists: ArtistSummary[];
}

async function fetchFollows(): Promise<ArtistSummary[]> {
  const res = await fetch("/api/follows");
  if (!res.ok) {
    throw new Error(`Failed to fetch follows: ${res.status}`);
  }
  const data = (await res.json()) as FollowsListResponse;
  return data.artists;
}

/**
 * 인증 사용자의 팔로우 목록을 React Query로 관리한다(F10.2).
 * 비로그인(unauthenticated) 시 네트워크 호출 없이 빈 목록을 반환한다.
 */
export function useFollows() {
  const { status } = useSession();
  const enabled = status === "authenticated";

  const query = useQuery<ArtistSummary[]>({
    queryKey: FOLLOWS_KEY,
    queryFn: fetchFollows,
    enabled,
    staleTime: 60 * 1000,
  });

  // 비로그인은 항상 빈 목록(네트워크 호출 없음).
  const artists = useMemo<ArtistSummary[]>(
    () => (enabled ? (query.data ?? []) : []),
    [enabled, query.data],
  );

  // 팔로우 여부 빠른 조회용 Set (artistId: number).
  const followedIds = useMemo(
    () => new Set(artists.map((a) => a.id)),
    [artists],
  );

  return {
    artists,
    followedIds,
    // 비로그인은 로딩 상태가 없다(즉시 빈 목록).
    isLoading: enabled ? query.isLoading : false,
    isError: enabled ? query.isError : false,
    isAuthenticated: enabled,
  };
}

interface ToggleFollowVars {
  artistId: number;
  /** 토글 후 목표 상태(true=팔로우, false=언팔로우). */
  follow: boolean;
  /** optimistic 추가용 이름(목록에 없던 아티스트를 팔로우할 때 필요). */
  name?: string;
}

async function postFollow(artistId: number): Promise<void> {
  const res = await fetch("/api/follows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to follow: ${res.status}`);
  }
}

async function deleteFollow(artistId: number): Promise<void> {
  const res = await fetch(`/api/follows?artistId=${artistId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to unfollow: ${res.status}`);
  }
}

/**
 * 팔로우/언팔로우 토글 mutation(F10.1).
 * optimistic update + 실패 시 롤백.
 */
export function useToggleFollow() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    ToggleFollowVars,
    { previous: ArtistSummary[] | undefined }
  >({
    mutationFn: ({ artistId, follow }) =>
      follow ? postFollow(artistId) : deleteFollow(artistId),
    onMutate: async ({ artistId, follow, name }) => {
      await queryClient.cancelQueries({ queryKey: FOLLOWS_KEY });
      const previous =
        queryClient.getQueryData<ArtistSummary[]>(FOLLOWS_KEY);

      queryClient.setQueryData<ArtistSummary[]>(FOLLOWS_KEY, (old) => {
        const list = old ?? [];
        if (follow) {
          if (list.some((a) => a.id === artistId)) return list;
          // 새로 팔로우: 최신 항목을 앞에(created_at DESC 정렬과 일치).
          return [{ id: artistId, name: name ?? "" }, ...list];
        }
        return list.filter((a) => a.id !== artistId);
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // 롤백: 토글 전 snapshot 복원.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(FOLLOWS_KEY, context.previous);
      }
    },
    onSettled: () => {
      // 서버 권위 데이터로 재동기화(이름 등 보정).
      void queryClient.invalidateQueries({ queryKey: FOLLOWS_KEY });
    },
  });
}
