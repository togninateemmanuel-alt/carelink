"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import {
  User,
  Mail,
  Lock,
  KeyRound,
  Stethoscope,
  ArrowRight,
  AlertCircle,
  Building2,
} from "lucide-react";

export default function HospitalRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    specialty: "",
    licenseKey: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hospitalPreview, setHospitalPreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === "licenseKey") setHospitalPreview(null);
  };

  const verifyKey = async () => {
    setError("");
    setHospitalPreview(null);
    const key = form.licenseKey.trim().toUpperCase();
    if (!key) {
      setError("Entrez la clé d'abonnement.");
      return null;
    }

    const supabase = createClient();
    const { data, error: qError } = await supabase
      .from("hospital_subscriptions")
      .select(
        `id, status, seats_used, expires_at, hospital_id,
         hospitals(name),
         subscription_plans(name, max_seats)`
      )
      .eq("license_key", key)
      .single();

    if (qError || !data) {
      setError("Clé d'abonnement invalide.");
      return null;
    }

    if (data.status !== "active") {
      setError("Cet abonnement n'est plus actif. Contactez l'administration.");
      return null;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setError("Cet abonnement a expiré. Renouvelez-le pour continuer.");
      return null;
    }

    const plan = data.subscription_plans as any;
    const maxSeats = plan?.max_seats;
    if (maxSeats !== null && maxSeats !== undefined && data.seats_used >= maxSeats) {
      setError(
        `Limite de postes atteinte (${data.seats_used}/${maxSeats}). Passez à un plan supérieur.`
      );
      return null;
    }

    const hospitalName = (data.hospitals as any)?.name || "Hôpital";
    setHospitalPreview(hospitalName);
    return data;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const subscription = await verifyKey();
    if (!subscription) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // 1. Créer le compte auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          role: "doctor",
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Erreur lors de la création du compte.");
      setLoading(false);
      return;
    }

    // 2. Profil
    await supabase.from("profiles").upsert({
      id: authData.user.id,
      role: "doctor",
      full_name: form.fullName,
      email: form.email,
    });

    // 3. Enregistrement médecin lié à l'hôpital + abonnement
    const { error: doctorError } = await supabase.from("doctors").insert({
      profile_id: authData.user.id,
      hospital_id: subscription.hospital_id,
      subscription_id: subscription.id,
      specialty: form.specialty || "Médecine générale",
      display_name: form.fullName,
      signature: form.fullName.startsWith("Dr")
        ? form.fullName
        : `Dr. ${form.fullName}`,
      stamp: `CACHET ${form.fullName.toUpperCase()}`,
      is_available: true,
    });

    if (doctorError) {
      console.error(doctorError);
      setError(
        "Compte créé mais liaison hôpital échouée. Contactez le support."
      );
      setLoading(false);
      return;
    }

    // 4. Incrémenter le nombre de postes utilisés
    await supabase
      .from("hospital_subscriptions")
      .update({ seats_used: (subscription.seats_used || 0) + 1 })
      .eq("id", subscription.id);

    router.push("/hospital");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-5 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Espace Médecin
          </h1>
          <p className="text-text-secondary mt-1">
            Créez votre compte avec la clé de l&apos;hôpital
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="space-y-4 max-w-sm mx-auto w-full"
        >
          <Input
            id="licenseKey"
            name="licenseKey"
            label="Clé d'abonnement hôpital"
            placeholder="Ex : CARE-A1B2-C3D4E5"
            value={form.licenseKey}
            onChange={handleChange}
            onBlur={verifyKey}
            required
            icon={
              <KeyRound className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />
            }
          />

          {hospitalPreview && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-success-light text-success text-sm">
              <Building2 className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
              <span>
                Hôpital détecté : <strong>{hospitalPreview}</strong>
              </span>
            </div>
          )}

          <Input
            id="fullName"
            name="fullName"
            label="Nom complet"
            placeholder="Ex : Dr Koffi Mensah"
            value={form.fullName}
            onChange={handleChange}
            required
            icon={<User className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
          />

          <Input
            id="specialty"
            name="specialty"
            label="Spécialité"
            placeholder="Ex : Médecine générale"
            value={form.specialty}
            onChange={handleChange}
            icon={
              <Stethoscope className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />
            }
          />

          <Input
            id="email"
            name="email"
            type="email"
            label="Email professionnel"
            placeholder="ex: dr.koffi@hopital.tg"
            value={form.email}
            onChange={handleChange}
            required
            icon={<Mail className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Mot de passe"
            placeholder="Minimum 6 caractères"
            value={form.password}
            onChange={handleChange}
            required
            icon={<Lock className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
          />

          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirmer le mot de passe"
            placeholder="Répétez le mot de passe"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            icon={<Lock className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
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
                Créer mon compte médecin
                <ArrowRight className="w-5 h-5" strokeWidth={1.75} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-8">
          Déjà un compte ?{" "}
          <Link href="/hospital/login" className="text-primary font-semibold">
            Se connecter
          </Link>
        </p>
        <p className="text-center text-xs text-text-muted mt-3">
          La clé d&apos;abonnement est fournie par votre hôpital après souscription.
        </p>
      </div>
    </div>
  );
}
