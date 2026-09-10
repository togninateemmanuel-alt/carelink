"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Building2,
  Calendar,
  User,
  Shield,
  CreditCard,
  Clock,
  Home,
  FileText,
} from "lucide-react";
import { Stepper } from "@/components/ui/Stepper";

export default function ConfirmationPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<any>(null);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem("consultationDraft");
    if (saved) {
      const data = JSON.parse(saved);
      if (!data.payment) {
        router.replace("/consultation/payment");
        return;
      }
      setDraft(data);

      // Simulation de transmission
      setTimeout(() => {
        setIsTransferring(false);
        // Numéro de file simulé
        const num = Math.floor(Math.random() * 20) + 1;
        setQueueNumber(num);

        // Sauvegarder le rendez-vous final
        const appointment = {
          ...data,
          queueNumber: num,
          status: "Confirmé",
          createdAt: new Date().toISOString(),
          id: Date.now(),
        };

        const existing = JSON.parse(localStorage.getItem("appointments") || "[]");
        existing.push(appointment);
        localStorage.setItem("appointments", JSON.stringify(existing));

        // Nettoyer le draft
        sessionStorage.removeItem("consultationDraft");
      }, 3500);
    } else {
      router.replace("/");
    }
  }, [router]);

  if (!draft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isTransferring) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-semibold text-text-primary text-center">
          Transmission du dossier
        </h2>
        <p className="text-text-secondary text-center mt-2">
          Envoi à {draft.hospital.name}...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-surface px-5 pt-12 pb-4 sticky top-0 z-10 shadow-soft">
        <h1 className="text-lg font-semibold text-text-primary text-center">
          Confirmation
        </h1>
      </header>

      <main className="px-5 pt-6">
        <div className="mb-8">
          <Stepper currentStep={5} totalSteps={5} />
        </div>

        {/* Success message */}
        <div className="card bg-success-light border border-success/20 text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-success" strokeWidth={1.75} />
          </div>
          <h2 className="text-xl font-bold text-success">Dossier validé !</h2>
          <p className="text-sm text-success/80 mt-1">
            Votre rendez-vous a été confirmé
          </p>
        </div>

        {/* Queue number */}
        <div className="card text-center mb-6">
          <p className="text-sm text-text-secondary mb-2">Votre numéro de file</p>
          <p className="text-5xl font-bold text-primary">N° {queueNumber}</p>
          <p className="text-sm text-text-secondary mt-3 flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4" strokeWidth={1.75} />
            Temps d&apos;attente estimé : {queueNumber ? queueNumber * 8 : 0} min
          </p>
        </div>

        {/* Summary */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-text-primary">Récapitulatif</h3>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-text-secondary mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="text-sm text-text-secondary">Patient</p>
              <p className="font-medium">{draft.fullName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-text-secondary mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="text-sm text-text-secondary">Hôpital</p>
              <p className="font-medium">{draft.hospital.name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-text-secondary mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="text-sm text-text-secondary">Consultation</p>
              <p className="font-medium">{draft.consultationType}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-text-secondary mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="text-sm text-text-secondary">Assurance</p>
              <p className="font-medium">
                {draft.insurance.hasInsurance
                  ? `${draft.insurance.company} (${draft.insurance.coverage} F CFA)`
                  : "Aucune"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-text-secondary mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="text-sm text-text-secondary">Paiement</p>
              <p className="font-medium">
                {draft.payment.method} — {draft.payment.amount} F CFA
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {draft.payment.status}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <Link href="/" className="btn-primary w-full">
            <Home className="w-5 h-5" strokeWidth={1.75} />
            Retour à l&apos;accueil
          </Link>
          <Link href="/appointments" className="btn-outline w-full">
            <FileText className="w-5 h-5" strokeWidth={1.75} />
            Voir mes rendez-vous
          </Link>
        </div>
      </main>
    </div>
  );
}
