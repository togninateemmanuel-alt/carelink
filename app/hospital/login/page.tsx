"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import {
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Building2,
} from "lucide-react";

export default function HospitalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : authError.message
      );
      setLoading(false);
      return;
    }

    // Vérifier que c'est bien un médecin lié à un hôpital
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id, hospital_id, subscription_id")
      .eq("profile_id", authData.user?.id)
      .maybeSingle();

    if (!doctor) {
      // Pas encore lié : demander la clé et créer le lien
      if (!licenseKey.trim()) {
        setError(
          "Compte non lié à un hôpital. Entrez la clé d'abonnement fournie par votre établissement."
        );
        setLoading(false);
        return;
      }

      const key = licenseKey.trim().toUpperCase();
      const { data: sub, error: subError } = await supabase
        .from("hospital_subscriptions")
        .select(
          "id, status, seats_used, expires_at, hospital_id, subscription_plans(max_seats)"
        )
        .eq("license_key", key)
        .single();

      if (subError || !sub) {
        setError("Clé d'abonnement invalide.");
        setLoading(false);
        return;
      }

      if (sub.status !== "active") {
        setError("Abonnement inactif.");
        setLoading(false);
        return;
      }

      if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
        setError("Abonnement expiré.");
        setLoading(false);
        return;
      }

      const maxSeats = (sub.subscription_plans as any)?.max_seats;
      if (
        maxSeats !== null &&
        maxSeats !== undefined &&
        sub.seats_used >= maxSeats
      ) {
        setError(`Limite de postes atteinte (${sub.seats_used}/${maxSeats}).`);
        setLoading(false);
        return;
      }

      // Créer le profil médecin
      const fullName =
        authData.user?.user_metadata?.full_name ||
        authData.user?.email ||
        "Médecin";

      await supabase.from("profiles").upsert({
        id: authData.user!.id,
        role: "doctor",
        full_name: fullName,
        email: authData.user!.email,
      });

      await supabase.from("doctors").insert({
        profile_id: authData.user!.id,
        hospital_id: sub.hospital_id,
        subscription_id: sub.id,
        specialty: "Médecine générale",
        display_name: fullName,
        signature: fullName,
        is_available: true,
      });

      await supabase
        .from("hospital_subscriptions")
        .update({ seats_used: (sub.seats_used || 0) + 1 })
        .eq("id", sub.id);
    } else if (doctor.subscription_id) {
      // Vérifier que l'abonnement est toujours valide
      const { data: sub } = await supabase
        .from("hospital_subscriptions")
        .select("status, expires_at, license_key")
        .eq("id", doctor.subscription_id)
        .single();

      if (!sub || sub.status !== "active") {
        setError("L'abonnement de votre hôpital n'est plus actif.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
        setError(
          "L'abonnement de votre hôpital a expiré. Demandez le renouvellement à l'administration."
        );
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    }

    router.push("/hospital");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-5 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">CareLink Hôpital</h1>
          <p className="text-text-secondary mt-1">Connexion médecin</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-4 max-w-sm mx-auto w-full"
        >
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="ex: dr.koffi@hopital.tg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<Mail className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
          />

          <Input
            id="password"
            type="password"
            label="Mot de passe"
            placeholder="Votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={<Lock className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
          />

          <Input
            id="licenseKey"
            label="Clé d'abonnement (si premier accès)"
            placeholder="CARE-XXXX-XXXXXX"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            icon={
              <KeyRound className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />
            }
          />

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-danger-light text-danger text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
              <p>{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Se connecter
                <ArrowRight className="w-5 h-5" strokeWidth={1.75} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-8">
          Nouveau médecin ?{" "}
          <Link href="/hospital/register" className="text-primary font-semibold">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
