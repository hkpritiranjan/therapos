import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In development, middleware passes all requests through.
// In production, this would verify the session cookie and redirect to login.
export function middleware(request: NextRequest) {
  // Dev passthrough — all routes accessible
  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
