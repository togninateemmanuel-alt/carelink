"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Star,
  MapPin,
  Shield,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Stepper } from "@/components/ui/Stepper";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Hospital } from "@/lib/supabase/types";

export default function ChooseHospitalPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem("consultationDraft");
    if (saved) {
      setDraft(JSON.parse(saved));
    } else {
      router.replace("/consultation/new");
      return;
    }

    const loadHospitals = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("hospitals")
        .select("*")
        .eq("is_active", true)
        .order("rating", { ascending: false });

      if (error) {
        console.error("Error loading hospitals:", error);
        // Fallback démo si la table n'est pas encore peuplée
        setHospitals([]);
      } else {
        setHospitals(data || []);
      }
      setLoading(false);
    };

    loadHospitals();
  }, [router]);

  const handleContinue = () => {
    if (!selectedId) return;

    const hospital = hospitals.find((h) => h.id === selectedId);
    if (!hospital) return;

    const updated = {
      ...draft,
      hospital: {
        id: hospital.id,
        name: hospital.name,
        price: hospital.consultation_price,
        insurances: hospital.accepted_insurances || [],
      },
    };

    sessionStorage.setItem("consultationDraft", JSON.stringify(updated));
    router.push("/consultation/insurance");
  };

  if (!draft || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
        <Link href="/consultation/new" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">
          Choix de l&apos;hôpital
        </h1>
      </header>

      <main className="px-5 pt-6">
        <div className="mb-8">
          <Stepper currentStep={2} totalSteps={5} />
        </div>

        <h2 className="text-lg font-semibold text-text-primary mb-1">
          Choisissez votre hôpital
        </h2>
        <p className="text-sm text-text-secondary mb-5">
          Sélectionnez l&apos;établissement qui vous convient
        </p>

        {hospitals.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-text-secondary text-sm">
              Aucun hôpital disponible pour le moment.
            </p>
            <p className="text-xs text-text-muted mt-2">
              Vérifiez que le schéma SQL a bien été exécuté dans Supabase.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {hospitals.map((hospital) => {
              const isSelected = selectedId === hospital.id;
              const insurances = hospital.accepted_insurances || [];

              return (
                <button
                  key={hospital.id}
                  type="button"
                  onClick={() => setSelectedId(hospital.id)}
                  className={cn(
                    "w-full text-left card transition-all duration-200",
                    isSelected
                      ? "ring-2 ring-primary border-primary bg-primary/5"
                      : "hover:shadow-md"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      <Building2 className="w-6 h-6" strokeWidth={1.75} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-text-primary">
                          {hospital.name}
                        </h3>
                        {isSelected && (
                          <CheckCircle2
                            className="w-5 h-5 text-primary flex-shrink-0"
                            strokeWidth={1.75}
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Star
                            className="w-3.5 h-3.5 text-warning fill-warning"
                            strokeWidth={1.75}
                          />
                          {hospital.rating}/5
                        </span>
                        {hospital.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />
                            {hospital.city}
                          </span>
                        )}
                      </div>

                      {insurances.length > 0 && (
                        <div className="mt-2.5 flex items-start gap-1.5">
                          <Shield
                            className="w-3.5 h-3.5 text-text-secondary mt-0.5 flex-shrink-0"
                            strokeWidth={1.75}
                          />
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {insurances.join(", ")}
                          </p>
                        </div>
                      )}

                      <p className="mt-3 text-primary font-bold text-lg">
                        {hospital.consultation_price} F CFA
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-5">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedId}
          className="btn-primary w-full disabled:opacity-50"
        >
          Continuer
          <ArrowRight className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
