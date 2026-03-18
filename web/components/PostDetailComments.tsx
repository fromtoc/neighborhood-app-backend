'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CommentSection from './CommentSection';
import type { PostSummary } from './CommentSection';

function Inner({ postId, postSummary }: { postId: number; postSummary?: PostSummary }) {
  const searchParams = useSearchParams();
  const commentId = searchParams.get('commentId');
  return (
    <CommentSection
      postId={postId}
      initialCommentId={commentId ? Number(commentId) : undefined}
      postSummary={postSummary}
    />
  );
}

export default function PostDetailComments({ postId, postSummary }: { postId: number; postSummary?: PostSummary }) {
  return (
    <Suspense fallback={null}>
      <Inner postId={postId} postSummary={postSummary} />
    </Suspense>
  );
}
