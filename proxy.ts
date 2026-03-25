import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const token = request.cookies.get("access_token")?.value;
    const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/register");

    // Redirect to login if accessing protected route without a token
    if (!token && !isAuthPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect to dashboard if logged in but trying to access login/register
    if (token && isAuthPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

// Specify which routes the middleware should run on
export const config = {
    matcher: ["/", "/chat", "/graph", "/login", "/register"],
};
