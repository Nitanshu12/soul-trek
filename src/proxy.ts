import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Everything needs a login again. A volunteer's profile pins them to one bus
// (profiles.bus_id); this enforces that at the route level too, not just via
// RLS, so a volunteer never lands on a blank screen for the wrong bus.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLoginPage = path === "/login";

  if (!user) {
    if (isLoginPage) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, bus_id")
    .eq("id", user.id)
    .single();

  if (path.startsWith("/admin") && profile?.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (path.startsWith("/bus/") && profile?.role !== "admin") {
    const requestedBusId = path.split("/")[2];
    if (profile?.bus_id && requestedBusId !== profile.bus_id) {
      const rest = path.split("/").slice(3).join("/");
      return NextResponse.redirect(
        new URL(`/bus/${profile.bus_id}${rest ? `/${rest}` : ""}`, request.url)
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-192.png|icon-512.png|api/).*)",
  ],
};
