import type { Metadata } from 'next';
import ChatContent from './ChatContent';

export const metadata: Metadata = { title: '聊聊' };

export default function ChatPage() {
  return <ChatContent />;
}
