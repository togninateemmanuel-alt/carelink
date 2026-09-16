"use client";

import Link from "next/link";
import { Building2, Stethoscope, UserRound, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StaffInfo {
  role: "hospital_admin" | "reception" | "doctor";
  display_name: string | null;
  hospital_id: string;
}

const sections = [
  {
    key: "reception",
    title: "Accueil",
    description: "Dossiers patients, validation, orientation et rendez-vous.",
    href: "/hospital/reception",
    icon: UserRound,
  },
  {
    key: "doctor",
    title: "Médecin",
    description: "Patients du jour, consultations, analyses et prescriptions.",
    href: "/hospital/doctor",
    icon: Stethoscope,
  },
  {
    key: "admin",
    title: "Administrateur",
    description: "Ordinateurs, autorisations, personnel et configuration de l'hôpital.",
    href: "/hospital/admin",
    icon: Settings,
  },
] as const;

export default function HospitalDashboardPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [hospitalName, setHospitalName] = useState("CareLink Hôpital");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccess();
  }, []);

  async function loadAccess() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/hospital/login");
      return;
    }

    const { data } = await supabase
      .from("hospital_staff")
      .select("role, display_name, hospital_id, hospitals(name)")
      .eq("profile_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!data) {
      router.replace("/hospital/login");
      return;
    }

    setStaff(data as unknown as StaffInfo);
    const hospital = (data as any).hospitals;
    if (hospital?.name) setHospitalName(hospital.name);
    setLoading(false);
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/hospital/login");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!staff) return null;

  const canSee = (key: string) => staff.role === "hospital_admin" || staff.role === key;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center"><Building2 className="w-6 h-6 text-white" /></div>
            <div><h1 className="font-bold text-text-primary">CareLink Hôpital</h1><p className="text-xs text-text-secondary">{hospitalName}</p></div>
          </div>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-slate-100" title="Déconnexion"><LogOut className="w-5 h-5 text-text-secondary" /></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-7">
          <p className="text-sm text-text-secondary">Session : {staff.display_name || "Personnel"}</p>
          <h2 className="text-2xl font-bold text-text-primary mt-1">Votre espace de travail</h2>
          <p className="text-sm text-text-secondary mt-2">Les sections disponibles dépendent des autorisations attribuées par l'administrateur.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {sections.filter((section) => canSee(section.key)).map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.key} href={section.href} className="card p-5 hover:shadow-md transition active:scale-[0.99]">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4"><Icon className="w-6 h-6 text-primary" /></div>
                <h3 className="font-semibold text-text-primary">{section.title}</h3>
                <p className="text-sm text-text-secondary mt-2 leading-5">{section.description}</p>
                <span className="inline-block mt-4 text-sm font-medium text-primary">Ouvrir →</span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
