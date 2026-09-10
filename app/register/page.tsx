"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { User, Mail, Phone, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
    const supabase = createClient();

    // 1. Créer le compte auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          phone: form.phone,
          role: "patient",
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Créer le profil
    if (authData.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        role: "patient",
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
      });

      if (profileError) {
        console.error("Profile error:", profileError);
        // On continue quand même, le trigger pourrait le créer
      }
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-5 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Créer un compte</h1>
          <p className="text-text-secondary mt-1">Rejoignez CareLink</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 max-w-sm mx-auto w-full">
          <Input
            id="fullName"
            name="fullName"
            label="Nom complet"
            placeholder="Ex : Jean Koffi"
            value={form.fullName}
            onChange={handleChange}
            required
            icon={<User className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
          />

          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="ex: jean@email.com"
            value={form.email}
            onChange={handleChange}
            required
            icon={<Mail className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
          />

          <Input
            id="phone"
            name="phone"
            type="tel"
            label="Téléphone"
            placeholder="Ex : 90 00 00 00"
            value={form.phone}
            onChange={handleChange}
            required
            icon={<Phone className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
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
                Créer mon compte
                <ArrowRight className="w-5 h-5" strokeWidth={1.75} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-8">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-primary font-semibold">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
