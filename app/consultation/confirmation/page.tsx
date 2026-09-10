"use client";

import { useState, useEffect, useRef } from "react";
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
  AlertCircle,
} from "lucide-react";
import { Stepper } from "@/components/ui/Stepper";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmationPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<any>(null);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(true);
  const [error, setError] = useState("");
  const savedRef = useRef(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("consultationDraft");
    if (!saved) {
      router.replace("/");
      return;
    }

    const data = JSON.parse(saved);
    if (!data.payment) {
      router.replace("/consultation/payment");
      return;
    }
    setDraft(data);

    if (savedRef.current) return;
    savedRef.current = true;

    const createAppointment = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Vous devez être connecté.");
          setIsTransferring(false);
          return;
        }

        // Calcul priorité simple selon symptômes
        const symptoms = (data.symptoms || "").toLowerCase();
        let priority = 3;
        if (
          symptoms.includes("accident") ||
          symptoms.includes("inconscient") ||
          symptoms.includes("hémorragie") ||
          symptoms.includes("convulsion")
        ) {
          priority = 1;
        } else if (
          symptoms.includes("fièvre") ||
          symptoms.includes("vomissement") ||
          symptoms.includes("douleur forte")
        ) {
          priority = 2;
        }

        // Numéro de file approximatif
        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("hospital_id", data.hospital.id)
          .in("status", ["pending", "validated"]);

        const num = (count || 0) + 1;

        const { data: appointment, error: insertError } = await supabase
          .from("appointments")
          .insert({
            patient_id: user.id,
            hospital_id: data.hospital.id,
            consultation_type: data.consultationType,
            symptoms: data.symptoms,
            has_insurance: data.insurance?.hasInsurance || false,
            insurance_company: data.insurance?.company || null,
            insurance_card_number: data.insurance?.cardNumber || null,
            insurance_coverage: data.insurance?.coverage || 0,
            consultation_price: data.hospital.price,
            remaining_amount: data.insurance?.remaining ?? data.hospital.price,
            payment_method: data.payment?.method || null,
            payment_status:
              data.payment?.method === "Cash" ? "cash_pending" : "paid",
            queue_number: num,
            priority,
            status: "pending",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          setError(
            "Erreur lors de l'enregistrement du dossier. Réessayez."
          );
          setIsTransferring(false);
          return;
        }

        // Petite pause pour l'animation
        await new Promise((r) => setTimeout(r, 2000));

        setQueueNumber(appointment.queue_number);
        setIsTransferring(false);
        sessionStorage.removeItem("consultationDraft");
      } catch (err) {
        console.error(err);
        setError("Une erreur est survenue.");
        setIsTransferring(false);
      }
    };

    createAppointment();
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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
        <div className="card text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="font-semibold text-text-primary mb-2">Erreur</h2>
          <p className="text-sm text-text-secondary mb-6">{error}</p>
          <Link href="/consultation/payment" className="btn-primary w-full">
            Réessayer
          </Link>
        </div>
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

        <div className="card bg-success-light border border-success/20 text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-success" strokeWidth={1.75} />
          </div>
          <h2 className="text-xl font-bold text-success">Dossier envoyé !</h2>
          <p className="text-sm text-success/80 mt-1">
            En attente de validation par l&apos;hôpital
          </p>
        </div>

        <div className="card text-center mb-6">
          <p className="text-sm text-text-secondary mb-2">Votre numéro de file</p>
          <p className="text-5xl font-bold text-primary">N° {queueNumber}</p>
          <p className="text-sm text-text-secondary mt-3 flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4" strokeWidth={1.75} />
            Temps d&apos;attente estimé : {queueNumber ? queueNumber * 8 : 0} min
          </p>
        </div>

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
                {draft.insurance?.hasInsurance
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
