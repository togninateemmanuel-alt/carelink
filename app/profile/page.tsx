"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Users,
  MapPin,
  Lock,
  KeyRound,
  ShieldCheck,
  Globe,
  Bell,
  Moon,
  HelpCircle,
  FileText,
  Shield,
  Info,
  LogOut,
  ChevronRight,
  Pencil,
} from "lucide-react";

function ListItem({
  icon: Icon,
  label,
  value,
  href = "#",
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-3.5 px-1 active:bg-slate-50 transition"
    >
      <Icon className="w-5 h-5 text-text-secondary flex-shrink-0" strokeWidth={1.75} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {value && (
          <p className="text-sm text-text-secondary truncate">{value}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" strokeWidth={1.75} />
    </Link>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data || {
        full_name: user.user_metadata?.full_name || "Utilisateur",
        email: user.email,
        phone: user.user_metadata?.phone || "",
      });
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
        <Link href="/" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">Profil</h1>
      </header>

      <main className="px-5 pt-8 space-y-6">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-12 h-12 text-primary" strokeWidth={1.5} />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-soft">
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
          <h2 className="mt-4 text-xl font-bold text-text-primary">
            {profile?.full_name || "Utilisateur"}
          </h2>
          <p className="text-text-secondary mt-1">
            {profile?.phone || profile?.email || ""}
          </p>
        </div>

        {/* Informations personnelles */}
        <section className="card !p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              Informations personnelles
            </h3>
          </div>
          <div className="px-4 divide-y divide-border">
            <ListItem icon={User} label="Nom complet" value={profile?.full_name} />
            <ListItem icon={Phone} label="Téléphone" value={profile?.phone || "Non renseigné"} />
            <ListItem icon={Mail} label="Email" value={profile?.email || "Non renseigné"} />
            <ListItem icon={Calendar} label="Date de naissance" value={profile?.date_of_birth || "Non renseigné"} />
            <ListItem icon={Users} label="Sexe" value={profile?.gender || "Non renseigné"} />
            <ListItem icon={MapPin} label="Adresse" value={profile?.address || "Non renseigné"} />
          </div>
        </section>

        {/* Sécurité */}
        <section className="card !p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              Sécurité
            </h3>
          </div>
          <div className="px-4 divide-y divide-border">
            <ListItem icon={Lock} label="Modifier le mot de passe" />
            <ListItem
              icon={KeyRound}
              label="Code d'ordonnance"
              href="/prescription-code"
            />
            <ListItem icon={ShieldCheck} label="Authentification à 2 facteurs" />
          </div>
        </section>

        {/* Préférences */}
        <section className="card !p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              Préférences
            </h3>
          </div>
          <div className="px-4 divide-y divide-border">
            <ListItem icon={Globe} label="Langue" value="Français" />
            <ListItem icon={Bell} label="Notifications" value="Activées" />
            <ListItem icon={Moon} label="Mode sombre" value="Désactivé" />
          </div>
        </section>

        {/* Support & Légal */}
        <section className="card !p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              Support & Légal
            </h3>
          </div>
          <div className="px-4 divide-y divide-border">
            <ListItem icon={HelpCircle} label="Centre d'aide" />
            <ListItem icon={FileText} label="Conditions d'utilisation" />
            <ListItem icon={Shield} label="Politique de confidentialité" />
            <ListItem icon={Info} label="À propos de CareLink" />
          </div>
        </section>

        {/* Logout */}
        <button onClick={handleLogout} className="btn-danger-outline w-full mt-2">
          <LogOut className="w-5 h-5" strokeWidth={1.75} />
          Se déconnecter
        </button>
      </main>
    </div>
  );
}
