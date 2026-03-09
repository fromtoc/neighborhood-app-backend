'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CommentSection from './CommentSection';

function Inner({ postId }: { postId: number }) {
  const searchParams = useSearchParams();
  const commentId = searchParams.get('commentId');
  return (
    <CommentSection
      postId={postId}
      initialCommentId={commentId ? Number(commentId) : undefined}
    />
  );
}

export default function PostDetailComments({ postId }: { postId: number }) {
  return (
    <Suspense fallback={null}>
      <Inner postId={postId} />
    </Suspense>
  );
}
