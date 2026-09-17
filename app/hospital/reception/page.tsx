"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Stethoscope,
  Users,
  UserRound,
} from "lucide-react";

const patients = [
  { name: "Afi K.", id: "CL-10482", reason: "Douleurs abdominales", time: "08:42", status: "À vérifier", initials: "AK" },
  { name: "Kossi A.", id: "CL-10481", reason: "Fièvre et fatigue", time: "08:36", status: "À vérifier", initials: "KA" },
  { name: "Ama S.", id: "CL-10479", reason: "Toux persistante", time: "08:21", status: "Validé", initials: "AS" },
  { name: "Yaw E.", id: "CL-10476", reason: "Maux de tête", time: "08:04", status: "Planifié", initials: "YE" },
];

const stats = [
  { label: "Nouveaux dossiers", value: "12", detail: "+3 aujourd’hui", icon: FileText },
  { label: "À vérifier", value: "7", detail: "Nécessitent votre attention", icon: Clock3 },
  { label: "Dossiers validés", value: "18", detail: "Depuis ce matin", icon: CheckCircle2 },
  { label: "Rendez-vous", value: "24", detail: "Aujourd’hui", icon: CalendarDays },
];

export default function HospitalReceptionPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Activity size={21} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-tight">CareLink</p>
              <p className="text-[11px] font-medium text-slate-400">HÔPITAL</p>
            </div>
          </div>

          <div className="px-4 py-5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Espace accueil</p>
            <nav className="mt-3 space-y-1">
              <NavItem active icon={<LayoutDashboard size={18} />} label="Tableau de bord" />
              <NavItem icon={<FileText size={18} />} label="Dossiers patients" badge="7" />
              <NavItem icon={<CalendarDays size={18} />} label="Rendez-vous" />
              <NavItem icon={<Users size={18} />} label="File d’attente" />
            </nav>

            <p className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Gestion</p>
            <nav className="mt-3 space-y-1">
              <NavItem icon={<Stethoscope size={18} />} label="Médecins" />
              <NavItem icon={<Settings2 size={18} />} label="Configuration" />
            </nav>
          </div>

          <div className="mt-auto border-t border-slate-100 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">AM</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Agent accueil</p>
                <p className="truncate text-xs text-slate-400">Accueil 1</p>
              </div>
              <button aria-label="Déconnexion" className="text-slate-400 transition hover:text-slate-900"><LogOut size={16} /></button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl sm:px-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <span>CareLink Hôpital</span><span>/</span><span className="text-slate-600">Accueil 1</span>
              </div>
              <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Bonjour, bienvenue 👋</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Système opérationnel
              </div>
              <button aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
              <Link href="/hospital/admin" className="hidden h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 sm:flex">
                Administration <ArrowRight size={14} />
              </Link>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-7 p-5 sm:p-8">
            <section className="overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.45)] sm:p-8">
              <div className="flex flex-col justify-between gap-7 md:flex-row md:items-center">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Poste Accueil 1 · Actif
                  </div>
                  <h2 className="max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">Gérez les dossiers patients avec simplicité.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Vérifiez les informations, validez les dossiers et orientez chaque patient vers la bonne spécialité.</p>
                </div>
                <button className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-slate-100">
                  <Plus size={17} /> Nouveau dossier
                </button>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(({ label, value, detail, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon size={19} /></div>
                    <MoreHorizontal size={18} className="text-slate-300" />
                  </div>
                  <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
                  <div className="mt-1 flex items-end gap-2"><p className="text-3xl font-bold tracking-tight">{value}</p><p className="pb-1 text-xs font-medium text-emerald-600">{detail}</p></div>
                </div>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><h3 className="font-bold tracking-tight">Dossiers entrants</h3><p className="mt-1 text-xs text-slate-400">Les patients en attente de vérification</p></div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-400"><Search size={15} /><span>Rechercher...</span></div>
                    <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><span>Tous</span><ChevronDown size={14} /></button>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {patients.map((patient) => (
                    <div key={patient.id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{patient.initials}</div>
                        <div className="min-w-0"><p className="font-semibold">{patient.name}</p><p className="mt-0.5 text-xs text-slate-400">{patient.id} · {patient.reason}</p></div>
                      </div>
                      <div className="flex items-center gap-4 sm:justify-end">
                        <div className="hidden text-right sm:block"><p className="text-xs font-semibold text-slate-600">{patient.time}</p><p className="mt-1 text-[11px] text-slate-400">Arrivée</p></div>
                        <Status status={patient.status} />
                        <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">Ouvrir <ArrowRight size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 p-4 text-center"><button className="text-xs font-bold text-slate-600 hover:text-slate-950">Voir tous les dossiers</button></div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between"><div><h3 className="font-bold tracking-tight">Aujourd’hui</h3><p className="mt-1 text-xs text-slate-400">17 septembre 2026</p></div><CalendarDays size={19} className="text-slate-400" /></div>
                  <div className="mt-6 space-y-4">
                    <MiniMetric icon={<Users size={17} />} label="Patients attendus" value="24" />
                    <MiniMetric icon={<CheckCircle2 size={17} />} label="Confirmés" value="18" />
                    <MiniMetric icon={<Clock3 size={17} />} label="En attente" value="6" />
                  </div>
                  <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-200">Voir le planning <ArrowRight size={14} /></button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between"><h3 className="font-bold tracking-tight">Accès rapides</h3><Settings2 size={18} className="text-slate-400" /></div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <QuickAction icon={<UserRound size={17} />} label="Patients" />
                    <QuickAction icon={<CalendarDays size={17} />} label="Planning" />
                    <QuickAction icon={<FileCheck2 size={17} />} label="Validation" />
                    <QuickAction icon={<Stethoscope size={17} />} label="Médecins" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function NavItem({ icon, label, badge, active = false }: { icon: React.ReactNode; label: string; badge?: string; active?: boolean }) {
  return <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><span>{icon}</span><span className="flex-1 text-left">{label}</span>{badge && <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"}`}>{badge}</span>}</button>;
}

function Status({ status }: { status: string }) {
  const styles: Record<string, string> = { "À vérifier": "bg-amber-50 text-amber-700", Validé: "bg-emerald-50 text-emerald-700", Planifié: "bg-blue-50 text-blue-700" };
  return <span className={`rounded-full px-2.5 py-1.5 text-[11px] font-bold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</div><p className="flex-1 text-xs font-medium text-slate-500">{label}</p><p className="text-sm font-bold">{value}</p></div>;
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <button className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-left text-xs font-semibold text-slate-600 transition hover:border-slate-200 hover:bg-white hover:text-slate-950"><span className="text-slate-500">{icon}</span>{label}</button>;
}
