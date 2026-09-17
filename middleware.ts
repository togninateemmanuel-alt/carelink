import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isHospital = pathname.startsWith("/hospital");
  const hospitalPublic = pathname === "/hospital/login" || pathname === "/hospital/register" || pathname === "/hospital/unauthorized";

  if (isHospital && !hospitalPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/hospital/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isHospital && !hospitalPublic && user) {
    const { data: staff } = await supabase.from("hospital_staff").select("id, role").eq("profile_id", user.id).eq("is_active", true).maybeSingle();
    if (!staff) {
      const url = request.nextUrl.clone();
      url.pathname = "/hospital/login";
      return NextResponse.redirect(url);
    }
    const section = pathname.startsWith("/hospital/admin") ? "admin" : pathname.startsWith("/hospital/reception") ? "reception" : pathname.startsWith("/hospital/doctor") ? "doctor" : null;
    if (section && staff.role !== "hospital_admin" && staff.role !== section) {
      const url = request.nextUrl.clone();
      url.pathname = "/hospital/unauthorized";
      return NextResponse.redirect(url);
    }
  }

  const protectedPaths = ["/consultation", "/appointments", "/prescriptions", "/pharmacy", "/profile", "/prescription-code"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const isAuthPage = ["/login", "/register"].some((path) => pathname.startsWith(path));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return supabaseResponse;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
