"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Smartphone,
  CreditCard,
  Banknote,
  CheckCircle2,
} from "lucide-react";
import { Stepper } from "@/components/ui/Stepper";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const paymentMethods = [
  { id: "TMoney", label: "TMoney", icon: Smartphone },
  { id: "Moov Money", label: "Moov Money", icon: Smartphone },
  { id: "Gozem", label: "Gozem", icon: Smartphone },
  { id: "Flooz", label: "Flooz", icon: Smartphone },
  { id: "Carte bancaire", label: "Carte bancaire", icon: CreditCard },
  { id: "Cash", label: "Espèces", icon: Banknote },
];

export default function PaymentPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("consultationDraft");
    if (saved) {
      const data = JSON.parse(saved);
      if (!data.insurance) {
        router.replace("/consultation/insurance");
        return;
      }
      setDraft(data);
    } else {
      router.replace("/consultation/new");
    }
  }, [router]);

  const remaining = draft?.insurance?.remaining ?? 0;
  const isMobileMoney = ["TMoney", "Moov Money", "Gozem", "Flooz"].includes(
    selectedMethod || ""
  );

  const handleConfirm = () => {
    setError("");

    if (!selectedMethod) {
      setError("Veuillez choisir un mode de paiement.");
      return;
    }

    if (isMobileMoney) {
      if (!phone.trim()) {
        setError("Veuillez entrer un numéro de téléphone.");
        return;
      }
      if (pin !== "1234") {
        setError("PIN incorrect. Pour la démonstration, utilisez : 1234");
        return;
      }
    }

    const updated = {
      ...draft,
      payment: {
        method: selectedMethod,
        amount: remaining,
        status:
          selectedMethod === "Cash"
            ? "À régler à l'hôpital"
            : "Paiement confirmé (simulation)",
        phone: isMobileMoney ? phone : undefined,
      },
    };

    sessionStorage.setItem("consultationDraft", JSON.stringify(updated));
    router.push("/consultation/confirmation");
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
        <Link href="/consultation/insurance" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">Paiement</h1>
      </header>

      <main className="px-5 pt-6">
        <div className="mb-8">
          <Stepper currentStep={4} totalSteps={5} />
        </div>

        {/* Récapitulatif */}
        <div className="card mb-6">
          <h2 className="font-semibold text-text-primary mb-4">Récapitulatif</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Consultation</span>
              <span className="font-medium">{draft.hospital.price} F CFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Prise en charge assurance</span>
              <span className="font-medium text-success">
                - {draft.insurance.coverage} F CFA
              </span>
            </div>
            <div className="border-t border-border pt-2 mt-2 flex justify-between">
              <span className="font-semibold">Reste à payer</span>
              <span className="font-bold text-primary text-lg">
                {remaining} F CFA
              </span>
            </div>
          </div>
        </div>

        {/* Modes de paiement */}
        <h3 className="font-semibold text-text-primary mb-3">Mode de paiement</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  setSelectedMethod(method.id);
                  setError("");
                }}
                className={cn(
                  "card flex flex-col items-center gap-2 py-4 transition",
                  isSelected
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:shadow-md"
                )}
              >
                <Icon
                  className={cn(
                    "w-6 h-6",
                    isSelected ? "text-primary" : "text-text-secondary"
                  )}
                  strokeWidth={1.75}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-primary" : "text-text-primary"
                  )}
                >
                  {method.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Champs Mobile Money */}
        {isMobileMoney && (
          <div className="card space-y-4 mb-5">
            <Input
              id="paymentPhone"
              label="Numéro de téléphone"
              type="tel"
              placeholder="Ex : 90 00 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              id="paymentPin"
              label="Code PIN (démonstration)"
              type="password"
              placeholder="1234"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <div className="bg-warning-light text-[#92400E] text-sm p-3 rounded-xl">
              Simulation uniquement. PIN de démonstration : <strong>1234</strong>
            </div>
          </div>
        )}

        {selectedMethod === "Cash" && (
          <div className="card bg-warning-light text-[#92400E] text-sm mb-5">
            <p className="font-medium">Paiement en espèces</p>
            <p className="mt-1">
              Le montant de <strong>{remaining} F CFA</strong> sera réglé
              directement à l&apos;hôpital.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-danger-light text-danger text-sm">
            {error}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-5">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedMethod}
          className="btn-primary w-full disabled:opacity-50"
        >
          Confirmer le paiement
          <ArrowRight className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
