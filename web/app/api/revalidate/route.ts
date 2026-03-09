import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

const SECRET = process.env.REVALIDATE_SECRET ?? '';

/**
 * On-demand ISR revalidation endpoint。
 * 後端（或 CI）呼叫此 API 觸發特定頁面立即重新產生。
 *
 * POST /api/revalidate
 * Body: { secret: string, paths?: string[], tags?: string[] }
 *
 * 範例：
 *   curl -X POST https://api.room18.top/api/revalidate \
 *     -H "Content-Type: application/json" \
 *     -d '{"secret":"xxx","paths":["/posts/42"]}'
 */
export async function POST(req: Request) {
  if (!SECRET) {
    return NextResponse.json({ error: 'REVALIDATE_SECRET not configured' }, { status: 500 });
  }

  let body: { secret?: string; paths?: string[]; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (body.secret !== SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const revalidated: string[] = [];

  for (const path of body.paths ?? []) {
    revalidatePath(path);
    revalidated.push(`path:${path}`);
  }

  for (const tag of body.tags ?? []) {
    revalidateTag(tag);
    revalidated.push(`tag:${tag}`);
  }

  return NextResponse.json({ revalidated, timestamp: new Date().toISOString() });
}
