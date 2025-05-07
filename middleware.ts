import { clerkMiddleware as authMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pending-approval',
  '/api/webhook/clerk',
  '/api/auth/clerk-redirect',
  '/api/auth/force-create',
  '/api/notifications/admin',
  '/api/health',
]);

// Define API routes that require authentication
const isApiRoute = createRouteMatcher([
  '/api/users/sync',
  '/api/assemblies(.*)',
  '/api/products(.*)',
  '/api/batches(.*)',
  '/api/components(.*)',
]);

// Improved auth middleware protecting page routes by default
export default authMiddleware(async (auth, req) => {
  // Always allow public routes
  if (isPublicRoute(req)) {
    return;
  }

  // For API routes, check authentication but don't redirect
  if (isApiRoute(req)) {
    try {
      // Check if the request is authenticated
    await auth.protect();
    } catch (error) {
      // Log the error for debugging
      console.error('Authentication error:', error);
      // Return early for API routes to let them handle the response
      return;
    }
    return;
  }
  
  // For all other routes, require authentication with redirect
  await auth.protect();

  // Add x-pathname header for setting active navigation items in server components
  const response = NextResponse.next();
  response.headers.set('x-pathname', req.nextUrl.pathname);
  return response;
});

// Updated matcher configuration to include all routes except static files
export const config = {
  matcher: [
    // Include all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 