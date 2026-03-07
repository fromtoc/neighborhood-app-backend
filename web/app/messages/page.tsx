import type { Metadata } from 'next';
import PrivateInbox from '@/components/PrivateInbox';

export const metadata: Metadata = { title: '私人訊息' };

export default function MessagesPage() {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✉️</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1c5373', marginBottom: '0.5rem' }}>
          私人訊息
        </h1>
        <p style={{ color: '#828282', fontSize: '0.9rem' }}>
          與鄰居的一對一對話
        </p>
      </div>
      <PrivateInbox />
    </>
  );
}
