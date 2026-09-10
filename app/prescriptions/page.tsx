"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Lock,
  Plus,
  Home,
  Calendar,
  Store,
  User,
  Shield,
} from "lucide-react";

export default function PrescriptionsPage() {
  const [hasPrescriptions, setHasPrescriptions] = useState(false);

  useEffect(() => {
    // Pour l'instant on regarde s'il y a des rendez-vous (plus tard on aura de vraies ordonnances)
    const appointments = localStorage.getItem("appointments");
    if (appointments) {
      const list = JSON.parse(appointments);
      setHasPrescriptions(list.length > 0);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
        <Link href="/" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">Mes ordonnances</h1>
      </header>

      <main className="px-5 pt-6">
        {!hasPrescriptions ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-text-primary">Aucune ordonnance</h3>
            <p className="text-sm text-text-secondary mt-2 mb-6 max-w-xs mx-auto">
              Vos ordonnances apparaîtront ici une fois que le médecin les aura rédigées après votre consultation.
            </p>
            <Link href="/consultation/new" className="btn-primary inline-flex">
              <Plus className="w-5 h-5" strokeWidth={1.75} />
              Prendre un rendez-vous
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Placeholder - sera remplacé quand le flux médecin sera prêt */}
            <div className="card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-primary" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-text-primary">Ordonnance protégée</h3>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warning-light text-[#92400E]">
                      En attente
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    Le médecin n&apos;a pas encore enregistré l&apos;ordonnance pour votre dernier rendez-vous.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                    <Shield className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Protégée par votre code secret
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-primary/5 border border-primary/20 text-sm text-text-secondary">
              <p>
                <strong className="text-text-primary">Comment ça marche ?</strong>
              </p>
              <p className="mt-2">
                Après votre consultation, le médecin rédige l&apos;ordonnance. Elle apparaît ici, verrouillée par le code secret que vous avez choisi. Vous pourrez ensuite chercher les médicaments dans les pharmacies.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-2 pb-safe pt-2">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Link href="/" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
            <Home className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Accueil</span>
          </Link>
          <Link href="/appointments" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
            <Calendar className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Rendez-vous</span>
          </Link>
          <Link href="/prescriptions" className="flex flex-col items-center gap-1 py-2 px-3 text-primary">
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
