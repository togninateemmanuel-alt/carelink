"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Stepper } from "@/components/ui/Stepper";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

// Base de démonstration des cartes d'assurance
const insuranceDatabase: Record<
  string,
  { nom: string; prenom: string; company: string; coverage: number }
> = {
  "INAM-DEMO-001": { nom: "KOFFI", prenom: "JEAN", company: "INAM", coverage: 100 },
  "INAM-DEMO-002": { nom: "AMADOU", prenom: "AICHA", company: "INAM", coverage: 100 },
  "INAM-DEMO-003": { nom: "MENSAH", prenom: "PAUL", company: "INAM", coverage: 80 },
  "NSIA-DEMO-001": { nom: "KOFFI", prenom: "JEAN", company: "NSIA", coverage: 80 },
  "SUNU-DEMO-001": { nom: "AMADOU", prenom: "AICHA", company: "SUNU", coverage: 70 },
  "AXA-DEMO-001": { nom: "MENSAH", prenom: "PAUL", company: "AXA", coverage: 60 },
  "ALLIANZ-DEMO-001": { nom: "KOFFI", prenom: "JEAN", company: "Allianz", coverage: 80 },
};

export default function InsurancePage() {
  const router = useRouter();
  const [draft, setDraft] = useState<any>(null);
  const [hasInsurance, setHasInsurance] = useState<"yes" | "no" | null>(null);
  const [form, setForm] = useState({
    company: "",
    lastName: "",
    firstName: "",
    cardNumber: "",
  });
  const [verified, setVerified] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("consultationDraft");
    if (saved) {
      const data = JSON.parse(saved);
      if (!data.hospital) {
        router.replace("/consultation/hospital");
        return;
      }
      setDraft(data);
    } else {
      router.replace("/consultation/new");
    }
  }, [router]);

  const availableCompanies =
    draft?.hospital?.insurances?.map((c: string) => ({
      value: c,
      label: c,
    })) || [];

  const handleVerify = () => {
    setError("");
    setSuccessMessage("");
    setVerified(false);

    if (!form.company || !form.lastName || !form.firstName || !form.cardNumber) {
      setError("Veuillez remplir toutes les informations.");
      return;
    }

    const card = insuranceDatabase[form.cardNumber.trim().toUpperCase()];

    if (!card) {
      setError(
        "Carte non reconnue. Exemples de démo : INAM-DEMO-001, NSIA-DEMO-001, SUNU-DEMO-001"
      );
      return;
    }

    if (card.company.toUpperCase() !== form.company.toUpperCase()) {
      setError("Cette carte ne correspond pas à l'assurance sélectionnée.");
      return;
    }

    if (
      card.nom !== form.lastName.trim().toUpperCase() ||
      card.prenom !== form.firstName.trim().toUpperCase()
    ) {
      setError("Le nom ou le prénom ne correspond pas à la carte.");
      return;
    }

    const price = draft.hospital.price;
    const covered = Math.min(price, card.coverage);
    setCoverage(covered);
    setVerified(true);
    setSuccessMessage(
      `Assurance vérifiée. Prise en charge : ${covered} F CFA. Reste à payer : ${price - covered} F CFA.`
    );
  };

  const handleContinue = () => {
    if (hasInsurance === "no") {
      const updated = {
        ...draft,
        insurance: {
          hasInsurance: false,
          coverage: 0,
          remaining: draft.hospital.price,
        },
      };
      sessionStorage.setItem("consultationDraft", JSON.stringify(updated));
      router.push("/consultation/payment");
      return;
    }

    if (!verified) return;

    const updated = {
      ...draft,
      insurance: {
        hasInsurance: true,
        company: form.company,
        lastName: form.lastName,
        firstName: form.firstName,
        cardNumber: form.cardNumber,
        coverage,
        remaining: draft.hospital.price - coverage,
      },
    };
    sessionStorage.setItem("consultationDraft", JSON.stringify(updated));
    router.push("/consultation/payment");
  };

  if (!draft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
        <Link href="/consultation/hospital" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">Assurance</h1>
      </header>

      <main className="px-5 pt-6">
        <div className="mb-8">
          <Stepper currentStep={3} totalSteps={5} />
        </div>

        {/* Question Oui / Non */}
        <div className="card mb-5">
          <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" strokeWidth={1.75} />
            Avez-vous une assurance maladie ?
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setHasInsurance("yes");
                setVerified(false);
                setError("");
                setSuccessMessage("");
              }}
              className={cn(
                "py-3.5 rounded-button font-medium border transition",
                hasInsurance === "yes"
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-text-primary border-border hover:border-primary"
              )}
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => {
                setHasInsurance("no");
                setVerified(false);
                setError("");
                setSuccessMessage("");
              }}
              className={cn(
                "py-3.5 rounded-button font-medium border transition",
                hasInsurance === "no"
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-text-primary border-border hover:border-primary"
              )}
            >
              Non
            </button>
          </div>
        </div>

        {/* Formulaire assurance */}
        {hasInsurance === "yes" && (
          <div className="card space-y-4 mb-5">
            <div className="bg-primary/5 rounded-xl p-4 text-sm">
              <p>
                <span className="font-medium">Hôpital :</span> {draft.hospital.name}
              </p>
              <p className="mt-1">
                <span className="font-medium">Prix consultation :</span>{" "}
                {draft.hospital.price} F CFA
              </p>
            </div>

            <Select
              id="company"
              name="company"
              label="Compagnie d'assurance"
              placeholder="-- Sélectionnez votre assurance --"
              options={availableCompanies}
              value={form.company}
              onChange={(e) => {
                setForm((p) => ({ ...p, company: e.target.value }));
                setVerified(false);
                setSuccessMessage("");
              }}
            />

            <Input
              id="lastName"
              name="lastName"
              label="Nom"
              placeholder="Nom inscrit sur la carte"
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
            />

            <Input
              id="firstName"
              name="firstName"
              label="Prénom"
              placeholder="Prénom inscrit sur la carte"
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
            />

            <Input
              id="cardNumber"
              name="cardNumber"
              label="Numéro de carte"
              placeholder="Ex : INAM-DEMO-001"
              value={form.cardNumber}
              onChange={(e) => setForm((p) => ({ ...p, cardNumber: e.target.value }))}
            />

            <button type="button" onClick={handleVerify} className="btn-primary w-full">
              Vérifier l&apos;assurance
            </button>

            {error && (
              <div className="flex items-start gap-2 p-4 rounded-xl bg-danger-light text-danger text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <p>{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 p-4 rounded-xl bg-success-light text-success text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <p>{successMessage}</p>
              </div>
            )}
          </div>
        )}

        {hasInsurance === "no" && (
          <div className="card bg-warning-light border border-warning/30 text-sm text-[#92400E]">
            <p className="font-medium">Vous avez indiqué ne pas avoir d&apos;assurance.</p>
            <p className="mt-1">Vous devrez payer la totalité de la consultation ({draft.hospital.price} F CFA).</p>
          </div>
        )}
      </main>

      {/* Bottom button */}
      {(hasInsurance === "no" || verified) && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-5">
          <button type="button" onClick={handleContinue} className="btn-primary w-full">
            Continuer
            <ArrowRight className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}
