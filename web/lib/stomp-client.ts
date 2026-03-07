'use client';

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { CLIENT_BASE_URL } from './api';

export function createStompClient(token: string | null): Client {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${CLIENT_BASE_URL}/ws`),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  });
  return client;
}
