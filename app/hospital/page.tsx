"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Bell,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  LogOut,
  Calendar,
  KeyRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface AppointmentRow {
  id: string;
  consultation_type: string;
  symptoms: string;
  status: string;
  queue_number: number | null;
  priority: number;
  remaining_amount: number;
  has_insurance: boolean;
  insurance_company: string | null;
  created_at: string;
  scheduled_at: string | null;
  profiles: { full_name: string; phone: string | null } | null;
  hospitals: { name: string } | null;
}

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Très prioritaire", color: "bg-danger-light text-danger" },
  2: { label: "Prioritaire", color: "bg-warning-light text-[#92400E]" },
  3: { label: "Normal", color: "bg-success-light text-success" },
};

export default function HospitalDashboardPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [hospitalName, setHospitalName] = useState("Espace Hôpital");
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "validated" | "all">("pending");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/hospital/login");
      return;
    }

    // Récupérer le médecin et son hôpital
    const { data: doctor } = await supabase
      .from("doctors")
      .select("hospital_id, hospitals(name)")
      .eq("profile_id", user.id)
      .maybeSingle();

    let hId = doctor?.hospital_id || null;

    if (doctor?.hospitals) {
      setHospitalName((doctor.hospitals as any).name || "Espace Hôpital");
    }

    // Si pas de profil médecin, rediriger vers inscription
    if (!doctor) {
      router.push("/hospital/register");
      return;
    }

    setHospitalId(hId);

    let query = supabase
      .from("appointments")
      .select(
        `id, consultation_type, symptoms, status, queue_number, priority,
         remaining_amount, has_insurance, insurance_company, created_at, scheduled_at,
         profiles!appointments_patient_id_fkey(full_name, phone),
         hospitals(name)`
      )
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (hId) {
      query = query.eq("hospital_id", hId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      const fallback = supabase
        .from("appointments")
        .select("*, hospitals(name)")
        .order("created_at", { ascending: false });
      const { data: simple } = hId
        ? await fallback.eq("hospital_id", hId)
        : await fallback;
      setAppointments((simple as any) || []);
    } else {
      setAppointments((data as any) || []);
      if (data && data.length > 0 && (data[0] as any).hospitals?.name) {
        setHospitalName((data[0] as any).hospitals.name);
      }
    }
    setLoading(false);
  };

  const filtered = appointments.filter((a) => {
    if (filter === "all") return true;
    if (filter === "pending") return a.status === "pending";
    return a.status === "validated" || a.status === "in_progress";
  });

  const pendingCount = appointments.filter((a) => a.status === "pending").length;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/hospital/login");
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-surface px-5 pt-12 pb-4 sticky top-0 z-10 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="font-bold text-text-primary">CareLink Hôpital</h1>
              <p className="text-xs text-text-secondary">{hospitalName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/hospital/subscription"
              className="p-2 rounded-full hover:bg-slate-100"
              title="Abonnement"
            >
              <KeyRound className="w-5 h-5 text-text-secondary" strokeWidth={1.75} />
            </Link>
            <Link
              href="/hospital/calendar"
              className="p-2 rounded-full hover:bg-slate-100"
              title="Calendrier"
            >
              <Calendar className="w-5 h-5 text-text-secondary" strokeWidth={1.75} />
            </Link>
            <button className="relative p-2 rounded-full hover:bg-slate-100">
              <Bell className="w-5 h-5 text-text-secondary" strokeWidth={1.75} />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            <button onClick={handleLogout} className="p-2 rounded-full hover:bg-slate-100">
              <LogOut className="w-5 h-5 text-text-secondary" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <main className="px-5 pt-5">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            <p className="text-xs text-text-secondary mt-1">En attente</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-success">
              {appointments.filter((a) => a.status === "validated").length}
            </p>
            <p className="text-xs text-text-secondary mt-1">Validés</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-primary">{appointments.length}</p>
            <p className="text-xs text-text-secondary mt-1">Total</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href="/hospital/calendar"
            className="card flex items-center gap-3 active:scale-[0.99] transition"
          >
            <Calendar className="w-5 h-5 text-primary" strokeWidth={1.75} />
            <span className="text-sm font-medium text-text-primary">Calendrier</span>
          </Link>
          <Link
            href="/hospital/subscription"
            className="card flex items-center gap-3 active:scale-[0.99] transition"
          >
            <KeyRound className="w-5 h-5 text-primary" strokeWidth={1.75} />
            <span className="text-sm font-medium text-text-primary">Abonnement</span>
          </Link>
        </div>

        <div className="flex gap-2 mb-5">
          {(
            [
              { key: "pending", label: "Nouveaux" },
              { key: "validated", label: "Validés" },
              { key: "all", label: "Tous" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition",
                filter === item.key
                  ? "bg-primary text-white"
                  : "bg-white text-text-secondary border border-border"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-text-secondary text-sm">Aucun dossier pour le moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((apt) => {
              const prio = priorityLabels[apt.priority] || priorityLabels[3];
              return (
                <Link
                  key={apt.id}
                  href={`/hospital/appointments/${apt.id}`}
                  className="card block active:scale-[0.99] transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" strokeWidth={1.75} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">
                          {apt.profiles?.full_name || "Patient"}
                        </h3>
                        <p className="text-sm text-text-secondary mt-0.5">
                          {apt.consultation_type}
                        </p>
                      </div>
                    </div>
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", prio.color)}>
                      {prio.label}
                    </span>
                  </div>

                  <p className="text-sm text-text-secondary mt-3 line-clamp-2">
                    {apt.symptoms}
                  </p>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                      {apt.scheduled_at
                        ? formatDate(apt.scheduled_at)
                        : formatDate(apt.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      {apt.status === "pending" ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-warning" strokeWidth={1.75} />
                          À valider
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" strokeWidth={1.75} />
                          {apt.queue_number ? `N° ${apt.queue_number}` : "Validé"}
                        </>
                      )}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
