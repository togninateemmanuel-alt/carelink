"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Mail, Lock, ArrowRight, FlaskConical } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // VERSION TEST : aucune création de compte ni confirmation e-mail n'est
    // requise. Le bouton ouvre directement l'interface patient.
    router.push(redirect);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-5 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">CareLink Patient</h1>
          <p className="text-text-secondary mt-1">Version de test — accès immédiat</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 max-w-sm mx-auto w-full">
          <Input
            id="email"
            type="email"
            label="Adresse e-mail"
            placeholder="ex: patient@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
          />

          <Input
            id="password"
            type="password"
            label="Mot de passe"
            placeholder="Votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
          />

          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm">
            <FlaskConical className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
            <p>Mode test actif : les identifiants saisis ne sont pas vérifiés pour le moment.</p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Accéder à mon espace
                <ArrowRight className="w-5 h-5" strokeWidth={1.75} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-8">
          L'inscription et la confirmation e-mail seront activées après la phase de test.
        </p>
        <Link href="/" className="text-center text-sm text-primary font-semibold mt-3">
          Retour à CareLink
        </Link>
      </div>
    </div>
  );
}
