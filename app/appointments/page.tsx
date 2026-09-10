"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Building2,
  Clock,
  Plus,
  FileText,
  Home,
  Store,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Appointment {
  id: number;
  fullName: string;
  consultationType: string;
  hospital: { name: string; price: number };
  insurance: { hasInsurance: boolean; company?: string; coverage: number; remaining: number };
  payment: { method: string; amount: number; status: string };
  queueNumber: number;
  status: string;
  createdAt: string;
  symptoms?: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  useEffect(() => {
    const saved = localStorage.getItem("appointments");
    if (saved) {
      setAppointments(JSON.parse(saved));
    }
  }, []);

  const sorted = [...appointments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filtered = sorted.filter((apt) => {
    if (filter === "all") return true;
    // Pour l'instant tous sont considérés comme "upcoming" car on n'a pas encore de date réelle de RDV
    if (filter === "upcoming") return apt.status === "Confirmé";
    return apt.status !== "Confirmé";
  });

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 z-10 shadow-soft">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
          </Link>
          <h1 className="text-lg font-semibold text-text-primary">Mes rendez-vous</h1>
        </div>
        <Link
          href="/consultation/new"
          className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center"
        >
          <Plus className="w-5 h-5" strokeWidth={2} />
        </Link>
      </header>

      <main className="px-5 pt-5">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(
            [
              { key: "all", label: "Tous" },
              { key: "upcoming", label: "À venir" },
              { key: "past", label: "Passés" },
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

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-text-primary">Aucun rendez-vous</h3>
            <p className="text-sm text-text-secondary mt-1 mb-6">
              Vous n&apos;avez pas encore de rendez-vous enregistré.
            </p>
            <Link href="/consultation/new" className="btn-primary inline-flex">
              <Plus className="w-5 h-5" strokeWidth={1.75} />
              Prendre un rendez-vous
            </Link>
          </div>
        )}

        {/* List */}
        <div className="space-y-4">
          {filtered.map((apt) => (
            <div key={apt.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">
                      {apt.hospital.name}
                    </h3>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {apt.consultationType}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap",
                    apt.status === "Confirmé"
                      ? "bg-success-light text-success"
                      : "bg-warning-light text-[#92400E]"
                  )}
                >
                  {apt.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {formatDate(apt.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                  N° {apt.queueNumber}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {apt.payment.amount} F CFA • {apt.payment.method}
                </span>
                <span className="text-xs text-text-muted">
                  {apt.insurance.hasInsurance
                    ? apt.insurance.company
                    : "Sans assurance"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-2 pb-safe pt-2">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Link href="/" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
            <Home className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Accueil</span>
          </Link>
          <Link href="/appointments" className="flex flex-col items-center gap-1 py-2 px-3 text-primary">
            <Calendar className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Rendez-vous</span>
          </Link>
          <Link href="/prescriptions" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
            <FileText className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Ordonnances</span>
          </Link>
          <Link href="/pharmacy" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
            <Store className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Pharmacie</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
            <User className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Profil</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
