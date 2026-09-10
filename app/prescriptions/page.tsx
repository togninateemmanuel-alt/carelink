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
  Building2,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/Input";

interface Appointment {
  id: number;
  fullName: string;
  phone?: string;
  consultationType: string;
  symptoms?: string;
  hospital: { name: string; price: number };
  insurance: {
    hasInsurance: boolean;
    company?: string;
    coverage: number;
    remaining: number;
    cardNumber?: string;
  };
  payment: { method: string; amount: number; status: string };
  queueNumber: number;
  status: string;
  createdAt: string;
  // Champs qui seront remplis plus tard par le médecin
  doctor?: string;
  doctorPhone?: string;
  doctorSignature?: string;
  doctorStamp?: string;
  temperature?: string;
  bpm?: string;
  bloodPressure?: string;
  prescription?: string;
  prescriptionInstructions?: string;
  prescriptionDate?: string;
  prescriptionSentToPatient?: boolean;
}

export default function PrescriptionsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [hasCode, setHasCode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("appointments");
    if (saved) {
      setAppointments(JSON.parse(saved));
    }
    const code = localStorage.getItem("prescriptionCode");
    setHasCode(!!code);
  }, []);

  const selected = appointments.find((a) => a.id === selectedId);

  // Pour la démo : on simule qu'une ordonnance existe si le RDV est confirmé
  // Plus tard ce sera le médecin qui l'enverra réellement
  const hasPrescription = (apt: Appointment) =>
    apt.prescriptionSentToPatient || apt.status === "Confirmé";

  const handleUnlock = () => {
    setError("");
    const savedCode = localStorage.getItem("prescriptionCode");

    if (!savedCode) {
      setError("Aucun code d'ordonnance enregistré. Créez-en un depuis votre profil.");
      return;
    }

    if (codeInput.trim() !== savedCode) {
      setError("Code incorrect.");
      return;
    }

    setUnlocked(true);
  };

  const handleClose = () => {
    setSelectedId(null);
    setUnlocked(false);
    setCodeInput("");
    setError("");
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ========== VUE DÉTAILLÉE ORDONNANCE ==========
  if (selected && unlocked) {
    const demoPrescription =
      selected.prescription ||
      `Paracétamol 500 mg — 2 comprimés par jour
Amoxicilline 500 mg — 1 comprimé matin et soir
Durée : 5 jours`;

    const demoInstructions =
      selected.prescriptionInstructions ||
      "Prendre les médicaments après les repas. Boire beaucoup d'eau. Revenir si les symptômes persistent après 3 jours.";

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
            {/* Header ordonnance */}
            <div className="text-center border-b border-border pb-4 mb-4">
              <h2 className="text-xl font-bold text-primary">ORDONNANCE MÉDICALE</h2>
              <p className="text-sm text-text-secondary mt-1">CareLink</p>
              <p className="text-sm text-text-secondary">
                {selected.prescriptionDate || formatDate(selected.createdAt)}
              </p>
            </div>

            {/* Patient */}
            <div className="mb-5">
              <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                <User className="w-4 h-4" strokeWidth={1.75} />
                Patient
              </h3>
              <p className="text-sm">
                <span className="text-text-secondary">Nom :</span>{" "}
                <strong>{selected.fullName}</strong>
              </p>
              <p className="text-sm mt-1">
                <span className="text-text-secondary">Consultation :</span>{" "}
                <strong>{selected.consultationType}</strong>
              </p>
              <p className="text-sm mt-1">
                <span className="text-text-secondary">Hôpital :</span>{" "}
                <strong>{selected.hospital.name}</strong>
              </p>
            </div>

            {/* Assurance */}
            <div className="mb-5 pb-4 border-b border-border">
              <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" strokeWidth={1.75} />
                Assurance
              </h3>
              <p className="text-sm">
                {selected.insurance.hasInsurance
                  ? `${selected.insurance.company} — Prise en charge : ${selected.insurance.coverage} F CFA`
                  : "Aucune assurance"}
              </p>
            </div>

            {/* Médicaments */}
            <div className="mb-5">
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" strokeWidth={1.75} />
                Médicaments prescrits
              </h3>
              <div className="bg-slate-50 rounded-xl p-4 text-sm whitespace-pre-line leading-relaxed">
                {demoPrescription}
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-5">
              <h3 className="font-semibold text-text-primary mb-2">Instructions</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {demoInstructions}
              </p>
            </div>

            {/* Médecin (démo) */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Stethoscope className="w-4 h-4" strokeWidth={1.75} />
                Médecin
              </h3>
              <p className="text-sm">
                <strong>{selected.doctor || "Dr. Médecin de garde"}</strong>
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {selected.doctorPhone || "Non renseigné"}
              </p>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm italic text-text-secondary">
                  Signature : {selected.doctorSignature || "Dr. Médecin"}
                </p>
                <div className="mt-2 inline-block border-2 border-double border-text-primary px-4 py-2 text-xs font-bold">
                  {selected.doctorStamp || "CACHET DU MÉDECIN"}
                </div>
              </div>
            </div>

            <div className="mt-5 p-3 rounded-xl bg-primary/5 text-sm text-text-secondary flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.75} />
              Cette ordonnance est protégée par votre code secret.
            </div>
          </div>

          <Link
            href="/pharmacy"
            className="btn-primary w-full mt-6"
          >
            <Store className="w-5 h-5" strokeWidth={1.75} />
            Rechercher une pharmacie
          </Link>
        </main>
      </div>
    );
  }

  // ========== VUE DÉVERROUILLAGE ==========
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
              Entrez le code secret choisi lors de votre inscription pour ouvrir cette ordonnance.
            </p>

            <Input
              id="accessCode"
              label="Code de l'ordonnance"
              type="password"
              placeholder="Votre code secret"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              icon={<KeyRound className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
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

  // ========== LISTE DES ORDONNANCES ==========
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
        <Link href="/" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">Mes ordonnances</h1>
      </header>

      <main className="px-5 pt-6">
        {appointments.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-text-primary">Aucune ordonnance</h3>
            <p className="text-sm text-text-secondary mt-2 mb-6 max-w-xs mx-auto">
              Vos ordonnances apparaîtront ici après vos consultations.
            </p>
            <Link href="/consultation/new" className="btn-primary inline-flex">
              <Plus className="w-5 h-5" strokeWidth={1.75} />
              Prendre un rendez-vous
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments
              .filter(hasPrescription)
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => setSelectedId(apt.id)}
                  className="card w-full text-left active:scale-[0.99] transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-6 h-6 text-primary" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-text-primary truncate">
                          {apt.hospital.name}
                        </h3>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success-light text-success whitespace-nowrap">
                          Disponible
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {apt.consultationType}
                      </p>
                      <p className="text-xs text-text-muted mt-2">
                        {formatDate(apt.createdAt)}
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
                  <AlertCircle className="w-5 h-5 text-[#92400E] flex-shrink-0" strokeWidth={1.75} />
                  <div>
                    <p className="font-medium text-[#92400E]">
                      Créez votre code d&apos;ordonnance
                    </p>
                    <p className="text-[#92400E]/80 mt-1">
                      Pour ouvrir vos ordonnances, vous devez d&apos;abord définir un code secret.
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
