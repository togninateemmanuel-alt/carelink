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
  Unlock,
  KeyRound,
  Stethoscope,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";

interface PrescriptionRow {
  id: string;
  medications: string;
  instructions: string | null;
  doctor_name: string | null;
  doctor_phone: string | null;
  doctor_signature: string | null;
  doctor_stamp: string | null;
  temperature: string | null;
  bpm: string | null;
  blood_pressure: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
  appointments: {
    consultation_type: string;
    hospitals: { name: string } | null;
  } | null;
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [selected, setSelected] = useState<PrescriptionRow | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [hasCode, setHasCode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Code d'ordonnance depuis le profil
      const { data: profile } = await supabase
        .from("profiles")
        .select("prescription_code")
        .eq("id", user.id)
        .single();

      if (profile?.prescription_code) {
        setHasCode(true);
        localStorage.setItem("prescriptionCode", profile.prescription_code);
      } else {
        const localCode = localStorage.getItem("prescriptionCode");
        setHasCode(!!localCode);
      }

      const { data, error } = await supabase
        .from("prescriptions")
        .select(
          `id, medications, instructions, doctor_name, doctor_phone,
           doctor_signature, doctor_stamp, temperature, bpm, blood_pressure,
           status, sent_at, created_at,
           appointments(consultation_type, hospitals(name))`
        )
        .eq("patient_id", user.id)
        .eq("status", "sent")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setPrescriptions((data as any) || []);
      }
      setLoading(false);
    };

    load();
  }, []);

  const handleUnlock = () => {
    setError("");
    const savedCode =
      localStorage.getItem("prescriptionCode") || "";

    if (!savedCode) {
      setError(
        "Aucun code d'ordonnance enregistré. Créez-en un depuis votre profil."
      );
      return;
    }

    if (codeInput.trim() !== savedCode) {
      setError("Code incorrect.");
      return;
    }

    setUnlocked(true);
  };

  const handleClose = () => {
    setSelected(null);
    setUnlocked(false);
    setCodeInput("");
    setError("");
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // ========== ORDONNANCE OUVERTE ==========
  if (selected && unlocked) {
    return (
      <div className="min-h-screen bg-background pb-10">
        <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
          <button onClick={handleClose} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Ordonnance</h1>
        </header>

        <main className="px-5 pt-6">
          <div className="card border-2 border-primary/20">
            <div className="text-center border-b border-border pb-4 mb-4">
              <h2 className="text-xl font-bold text-primary">ORDONNANCE MÉDICALE</h2>
              <p className="text-sm text-text-secondary mt-1">CareLink</p>
              <p className="text-sm text-text-secondary">
                {formatDate(selected.sent_at || selected.created_at)}
              </p>
            </div>

            <div className="mb-5">
              <h3 className="font-semibold text-text-primary mb-2">Consultation</h3>
              <p className="text-sm">
                {selected.appointments?.consultation_type || "—"}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {selected.appointments?.hospitals?.name || ""}
              </p>
            </div>

            {(selected.temperature || selected.bpm || selected.blood_pressure) && (
              <div className="mb-5 pb-4 border-b border-border">
                <h3 className="font-semibold text-text-primary mb-2">Constantes</h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {selected.temperature && (
                    <p>🌡️ {selected.temperature}°C</p>
                  )}
                  {selected.bpm && <p>❤️ {selected.bpm} BPM</p>}
                  {selected.blood_pressure && (
                    <p>🩸 {selected.blood_pressure}</p>
                  )}
                </div>
              </div>
            )}

            <div className="mb-5">
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" strokeWidth={1.75} />
                Médicaments prescrits
              </h3>
              <div className="bg-slate-50 rounded-xl p-4 text-sm whitespace-pre-line leading-relaxed">
                {selected.medications}
              </div>
            </div>

            {selected.instructions && (
              <div className="mb-5">
                <h3 className="font-semibold text-text-primary mb-2">Instructions</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {selected.instructions}
                </p>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Stethoscope className="w-4 h-4" strokeWidth={1.75} />
                Médecin
              </h3>
              <p className="text-sm">
                <strong>{selected.doctor_name || "Médecin"}</strong>
              </p>
              {selected.doctor_phone && (
                <p className="text-sm text-text-secondary mt-1">
                  {selected.doctor_phone}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm italic text-text-secondary">
                  Signature : {selected.doctor_signature || selected.doctor_name}
                </p>
                <div className="mt-2 inline-block border-2 border-double border-text-primary px-4 py-2 text-xs font-bold">
                  {selected.doctor_stamp || "CACHET DU MÉDECIN"}
                </div>
              </div>
            </div>

            <div className="mt-5 p-3 rounded-xl bg-primary/5 text-sm text-text-secondary flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.75} />
              Cette ordonnance est protégée par votre code secret.
            </div>
          </div>

          <Link href="/pharmacy" className="btn-primary w-full mt-6">
            <Store className="w-5 h-5" strokeWidth={1.75} />
            Rechercher une pharmacie
          </Link>
        </main>
      </div>
    );
  }

  // ========== DÉVERROUILLAGE ==========
  if (selected && !unlocked) {
    return (
      <div className="min-h-screen bg-background pb-10">
        <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
          <button onClick={handleClose} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">
            Ordonnance protégée
          </h1>
        </header>

        <main className="px-5 pt-8">
          <div className="card text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="font-semibold text-text-primary text-lg">
              Ordonnance verrouillée
            </h2>
            <p className="text-sm text-text-secondary mt-2 mb-6">
              Entrez votre code secret pour ouvrir cette ordonnance.
            </p>

            <Input
              id="accessCode"
              label="Code de l'ordonnance"
              type="password"
              placeholder="Votre code secret"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              icon={
                <KeyRound className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />
              }
            />

            {error && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-danger-light text-danger text-sm text-left">
                <AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
                <p>{error}</p>
              </div>
            )}

            <button onClick={handleUnlock} className="btn-primary w-full mt-5">
              <Unlock className="w-5 h-5" strokeWidth={1.75} />
              Ouvrir mon ordonnance
            </button>

            {!hasCode && (
              <Link
                href="/prescription-code"
                className="block mt-4 text-sm text-primary font-medium"
              >
                Créer mon code d&apos;ordonnance →
              </Link>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ========== LISTE ==========
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
        <Link href="/" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">Mes ordonnances</h1>
      </header>

      <main className="px-5 pt-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-text-primary">Aucune ordonnance</h3>
            <p className="text-sm text-text-secondary mt-2 mb-6 max-w-xs mx-auto">
              Vos ordonnances apparaîtront ici après qu&apos;un médecin les ait rédigées.
            </p>
            <Link href="/consultation/new" className="btn-primary inline-flex">
              <Plus className="w-5 h-5" strokeWidth={1.75} />
              Prendre un rendez-vous
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((rx) => (
              <button
                key={rx.id}
                onClick={() => setSelected(rx)}
                className="card w-full text-left active:scale-[0.99] transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-text-primary truncate">
                        {rx.appointments?.hospitals?.name || "Ordonnance"}
                      </h3>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success-light text-success whitespace-nowrap">
                        Disponible
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {rx.appointments?.consultation_type || "Consultation"}
                    </p>
                    <p className="text-xs text-text-muted mt-2">
                      {formatDate(rx.sent_at || rx.created_at)}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
                      <Shield className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Protégée par code secret
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {!hasCode && (
              <div className="card bg-warning-light border border-warning/30 text-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className="w-5 h-5 text-[#92400E] flex-shrink-0"
                    strokeWidth={1.75}
                  />
                  <div>
                    <p className="font-medium text-[#92400E]">
                      Créez votre code d&apos;ordonnance
                    </p>
                    <p className="text-[#92400E]/80 mt-1">
                      Pour ouvrir vos ordonnances, définissez un code secret.
                    </p>
                    <Link
                      href="/prescription-code"
                      className="inline-block mt-2 font-semibold text-[#92400E] underline"
                    >
                      Créer mon code →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

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
