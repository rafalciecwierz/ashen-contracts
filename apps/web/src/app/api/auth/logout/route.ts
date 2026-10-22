import { clearSessionCookie } from '@/http/session';
import { NextResponse } from 'next/server';

// POST on purpose, not GET: logging out changes state, and GET requests can be
// fired by link prefetching or an <img> tag on another site. Browsers and
// frameworks assume GET is safe to trigger without the user's intent.
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
