import { createClient } from "@/lib/supabase/server";

export type HospitalSection = "admin" | "reception" | "doctor";

export interface HospitalAccessContext {
  userId: string;
  hospitalId: string;
  staffId: string;
  role: HospitalSection;
}

/**
 * Resolve the authenticated user's hospital membership.
 * Server-side authorization must use this helper before protected actions.
 */
export async function getHospitalAccess(): Promise<HospitalAccessContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: staff, error } = await supabase
    .from("hospital_staff")
    .select("id, hospital_id, role, is_active")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !staff) return null;

  return {
    userId: user.id,
    hospitalId: staff.hospital_id,
    staffId: staff.id,
    role: staff.role as HospitalSection,
  };
}

export function canAccessSection(
  context: HospitalAccessContext,
  section: HospitalSection,
): boolean {
  return context.role === "admin" || context.role === section;
}
