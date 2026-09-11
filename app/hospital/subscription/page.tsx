"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  Building2,
  Users,
  Calendar,
  CheckCircle2,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function HospitalSubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/hospital/login");
      return;
    }

    const { data: doctor } = await supabase
      .from("doctors")
      .select("hospital_id, subscription_id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!doctor?.subscription_id) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("hospital_subscriptions")
      .select(
        `*,
         hospitals(name),
         subscription_plans(name, code, max_seats, price_monthly, description)`
      )
      .eq("id", doctor.subscription_id)
      .single();

    setInfo(data);
    setLoading(false);
  };

  const copyKey = () => {
    if (!info?.license_key) return;
    navigator.clipboard.writeText(info.license_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-background px-5 pt-12">
        <Link href="/hospital" className="flex items-center gap-2 text-text-secondary mb-6">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.75} />
          Retour
        </Link>
        <div className="card text-center py-10">
          <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-text-secondary text-sm">
            Aucun abonnement lié à votre compte.
          </p>
        </div>
      </div>
    );
  }

  const plan = info.subscription_plans;
  const hospital = info.hospitals;
  const maxSeats = plan?.max_seats;
  const seatsLabel =
    maxSeats === null || maxSeats === undefined
      ? "Illimité"
      : `${info.seats_used} / ${maxSeats}`;
  const isExpired =
    info.expires_at && new Date(info.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
        <Link href="/hospital" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">Abonnement</h1>
      </header>

      <main className="px-5 pt-6 space-y-5">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-bold text-text-primary">
                {hospital?.name || "Hôpital"}
              </h2>
              <p className="text-sm text-text-secondary">
                Plan {plan?.name || "—"}
              </p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              info.status === "active" && !isExpired
                ? "bg-success-light text-success"
                : "bg-danger-light text-danger"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            {isExpired ? "Expiré" : info.status === "active" ? "Actif" : info.status}
          </div>
        </div>

        {/* Clé */}
        <div className="card">
          <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
            <KeyRound className="w-4 h-4" strokeWidth={1.75} />
            Clé d&apos;abonnement
          </h3>
          <p className="text-xs text-text-secondary mb-3">
            À transmettre uniquement aux médecins de votre établissement.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm font-mono text-text-primary tracking-wide">
              {info.license_key}
            </code>
            <button
              onClick={copyKey}
              className="p-3 rounded-xl border border-border hover:bg-slate-50"
            >
              {copied ? (
                <CheckCircle2 className="w-5 h-5 text-success" strokeWidth={1.75} />
              ) : (
                <Copy className="w-5 h-5 text-text-secondary" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <Users className="w-3.5 h-3.5" strokeWidth={1.75} />
              Postes utilisés
            </div>
            <p className="text-xl font-bold text-text-primary">{seatsLabel}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
              Expiration
            </div>
            <p className="text-sm font-bold text-text-primary">
              {info.expires_at
                ? new Date(info.expires_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>

        {plan?.description && (
          <div className="card bg-slate-50 text-sm text-text-secondary">
            {plan.description}
            {plan.price_monthly != null && (
              <p className="mt-2 font-medium text-text-primary">
                {plan.price_monthly.toLocaleString("fr-FR")} F CFA / mois
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
