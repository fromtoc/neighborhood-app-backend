import { CLIENT_BASE_URL } from './api';

export interface FollowedNeighborhood {
  id: number;
  name: string;
  city: string;
  district: string;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchFollowing(token: string): Promise<FollowedNeighborhood[]> {
  const res = await fetch(`${CLIENT_BASE_URL}/api/v1/follows`, {
    headers: authHeaders(token),
  });
  const json = await res.json();
  return (json.data ?? []) as FollowedNeighborhood[];
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
  await fetch(`${CLIENT_BASE_URL}/api/v1/follows/${neighborhoodId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}
