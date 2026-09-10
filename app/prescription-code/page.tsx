"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/Input";

export default function PrescriptionCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [existingCode, setExistingCode] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("prescriptionCode");
    if (saved) setExistingCode(saved);
  }, []);

  const handleSave = () => {
    setError("");
    setSuccess(false);

    if (!code.trim()) {
      setError("Veuillez choisir un code.");
      return;
    }
    if (code.length < 4) {
      setError("Le code doit contenir au moins 4 caractères.");
      return;
    }
    if (code !== confirmCode) {
      setError("Les deux codes ne correspondent pas.");
      return;
    }

    localStorage.setItem("prescriptionCode", code);
    setExistingCode(code);
    setSuccess(true);
    setCode("");
    setConfirmCode("");
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
        <Link href="/profile" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">
          Code d&apos;ordonnance
        </h1>
      </header>

      <main className="px-5 pt-6 space-y-6">
        <div className="card text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="font-semibold text-text-primary text-lg">
            Protégez vos ordonnances
          </h2>
          <p className="text-sm text-text-secondary mt-2">
            Ce code secret permettra d&apos;ouvrir vos ordonnances et de les partager
            en toute sécurité avec les pharmacies.
          </p>
        </div>

        {existingCode && !success && (
          <div className="card bg-success-light border border-success/20">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-success mt-0.5" strokeWidth={1.75} />
              <div>
                <p className="font-medium text-success">Code déjà enregistré</p>
                <p className="text-sm text-success/80 mt-1">
                  Vous pouvez le modifier ci-dessous si besoin.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card space-y-4">
          <div className="relative">
            <Input
              id="code"
              label="Votre code d'ordonnance"
              type={showCode ? "text" : "password"}
              placeholder="Ex : 2580"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="absolute right-3 top-[38px] text-text-muted"
            >
              {showCode ? (
                <EyeOff className="w-5 h-5" strokeWidth={1.75} />
              ) : (
                <Eye className="w-5 h-5" strokeWidth={1.75} />
              )}
            </button>
          </div>

          <Input
            id="confirmCode"
            label="Confirmer le code"
            type={showCode ? "text" : "password"}
            placeholder="Répétez votre code"
            maxLength={8}
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
          />

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-danger-light text-danger text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-success-light text-success text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
              <p>Code enregistré avec succès !</p>
            </div>
          )}

          <button onClick={handleSave} className="btn-primary w-full">
            {existingCode ? "Modifier mon code" : "Enregistrer mon code"}
          </button>
        </div>

        <div className="card bg-slate-50 text-sm text-text-secondary">
          <p className="font-medium text-text-primary mb-1">Conseils de sécurité</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Choisissez un code d&apos;au moins 4 caractères</li>
            <li>Ne partagez ce code qu&apos;avec les pharmacies de confiance</li>
            <li>Vous pourrez le modifier à tout moment depuis votre profil</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
