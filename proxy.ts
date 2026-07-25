import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl, languageAlternates } from "@/lib/seo/site";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname.replace(/\/$/, "") || "/";
  const canonicalRedirects: Record<string, string> = {
    "/en/market": "/en/dashboard",
    "/en/quant-lab": "/en/research/td3",
    "/mercado": "/dashboard",
    "/quant-lab": "/investigacion/td3",
  };
  const canonicalPathname = canonicalRedirects[pathname]
    ?? (pathname === "/investigacion"
      ? "/investigacion/td3"
      : pathname === "/en/research"
        ? "/en/research/td3"
        : pathname);
  const alternates = languageAlternates(canonicalPathname);
  const links = [`<${absoluteUrl(canonicalPathname)}>; rel="canonical"`];
  if (alternates) {
    for (const [language, url] of Object.entries(alternates)) links.push(`<${url}>; rel="alternate"; hreflang="${language}"`);
  }
  response.headers.set("Link", links.join(", "));
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt|reports/).*)"],
};
