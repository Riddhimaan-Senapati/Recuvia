import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // For API routes, we need to handle OPTIONS requests for CORS
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // For all other requests, just continue normally
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
}; 