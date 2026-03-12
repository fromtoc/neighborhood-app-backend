import { CLIENT_BASE_URL } from './api';

export interface FollowedNeighborhood {
  id: number;
  name: string;
  city: string;
  district: string;
  isDefault: boolean;
  alias: string | null;
}

export interface FollowListResponse {
  follows: FollowedNeighborhood[];
  cooldownSlots: number;
  cooldownExpiredAt: string | null;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchFollowing(token: string): Promise<FollowListResponse> {
  const res = await fetch(`${CLIENT_BASE_URL}/api/v1/follows`, {
    headers: authHeaders(token),
  });
  const json = await res.json();
  const data = json.data ?? { follows: [], cooldownSlots: 0, cooldownExpiredAt: null };
  return data as FollowListResponse;
}

export async function followNeighborhood(token: string, neighborhoodId: number): Promise<void> {
  const res = await fetch(`${CLIENT_BASE_URL}/api/v1/follows/${neighborhoodId}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message ?? '關注失敗');
}

export async function unfollowNeighborhood(token: string, neighborhoodId: number): Promise<void> {
  const res = await fetch(`${CLIENT_BASE_URL}/api/v1/follows/${neighborhoodId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message ?? '取消關注失敗');
}

export async function setDefaultNeighborhood(token: string, neighborhoodId: number): Promise<void> {
  const res = await fetch(`${CLIENT_BASE_URL}/api/v1/follows/${neighborhoodId}/default`, {
    method: 'PUT',
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message ?? '設定預設失敗');
}

export async function updateFollowAlias(token: string, neighborhoodId: number, alias: string): Promise<void> {
  const res = await fetch(`${CLIENT_BASE_URL}/api/v1/follows/${neighborhoodId}/alias`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ alias }),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message ?? '更新別名失敗');
}
