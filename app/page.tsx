import Link from "next/link";
import {
  Bell,
  Calendar,
  CalendarPlus,
  FileText,
  Home,
  Store,
  User,
  Building2,
  Clock,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 z-10 shadow-soft">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-bold text-lg text-primary">CareLink</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-full hover:bg-slate-100 transition">
            <Bell className="w-5 h-5 text-text-secondary" strokeWidth={1.75} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
          </button>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" strokeWidth={1.75} />
          </div>
        </div>
      </header>

      <main className="px-5 pt-6 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Bonjour, Jean 👋
          </h1>
          <p className="text-text-secondary mt-1">
            Comment allez-vous aujourd&apos;hui ?
          </p>
        </div>

        {/* Main CTA */}
        <Link
          href="/consultation/new"
          className="block bg-primary rounded-card p-5 text-white shadow-card active:scale-[0.98] transition"
        >
          <div className="flex items-start gap-4">
            <div className="bg-white/20 rounded-xl p-3">
              <CalendarPlus className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Prendre un rendez-vous</h2>
              <p className="text-white/80 text-sm mt-1">
                Consultez un médecin rapidement
              </p>
            </div>
          </div>
        </Link>

        {/* Next appointment */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary">Prochain rendez-vous</h3>
            <Link href="/appointments" className="text-sm text-primary font-medium">
              Voir tout
            </Link>
          </div>

          <div className="card">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-primary" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-text-primary truncate">
                  Hôpital Central
                </h4>
                <p className="text-sm text-text-secondary mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Mercredi 28 mai • 10:30
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm text-text-secondary flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                    N° 12
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-success-light text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Confirmé
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <h3 className="font-semibold text-text-primary mb-3">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/appointments"
              className="card flex flex-col items-center justify-center py-5 gap-2 active:scale-[0.97] transition"
            >
              <Calendar className="w-6 h-6 text-primary" strokeWidth={1.75} />
              <span className="text-sm font-medium text-text-primary">Mes rendez-vous</span>
            </Link>
            <Link
              href="/prescriptions"
              className="card flex flex-col items-center justify-center py-5 gap-2 active:scale-[0.97] transition"
            >
              <FileText className="w-6 h-6 text-primary" strokeWidth={1.75} />
              <span className="text-sm font-medium text-text-primary">Mes ordonnances</span>
            </Link>
            <Link
              href="/pharmacy"
              className="card flex flex-col items-center justify-center py-5 gap-2 active:scale-[0.97] transition"
            >
              <Store className="w-6 h-6 text-primary" strokeWidth={1.75} />
              <span className="text-sm font-medium text-text-primary">Pharmacies</span>
            </Link>
            <Link
              href="/profile"
              className="card flex flex-col items-center justify-center py-5 gap-2 active:scale-[0.97] transition"
            >
              <User className="w-6 h-6 text-primary" strokeWidth={1.75} />
              <span className="text-sm font-medium text-text-primary">Mon profil</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-2 pb-safe pt-2">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Link href="/" className="flex flex-col items-center gap-1 py-2 px-3 text-primary">
            <Home className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Accueil</span>
          </Link>
          <Link href="/appointments" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
            <Calendar className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Rendez-vous</span>
          </Link>
          <Link href="/prescriptions" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
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
