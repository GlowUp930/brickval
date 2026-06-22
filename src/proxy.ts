import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/scan(.*)",
  "/result(.*)",
  "/upgrade(.*)",
]);

const clerkIsConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

const authMiddleware = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default clerkIsConfigured
  ? authMiddleware
  : function proxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/scan/:path*",
    "/result/:path*",
    "/upgrade/:path*",
    "/api/:path*",
    "/trpc/:path*",
    "/__clerk/:path*",
  ],
};
