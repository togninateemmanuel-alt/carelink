"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, Bell, CalendarDays, CheckCircle2, Clock3, FileText, LogOut, Search, Stethoscope, UserRound, ClipboardList, Pill, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Staff { id: string; hospital_id: string; display_name: string | null; role: "doctor" | "hospital_admin" | "reception"; }
interface Doctor { id: string; display_name: string | null; specialty_id: string | null; }
interface Appointment { id: string; patient_id: string; scheduled_for: string | null; status: string; patient_report: string | null; }

export default function HospitalDoctorPage() {
  const router = useRouter(); const supabase = createClient();
  const [staff, setStaff] = useState<Staff | null>(null); const [appointments, setAppointments] = useState<Appointment[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true); setError(""); const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/hospital/login"); return; }
    const { data: staffData } = await supabase.from("hospital_staff").select("id,hospital_id,display_name,role").eq("profile_id", user.id).eq("is_active", true).maybeSingle();
    if (!staffData || !["doctor","hospital_admin"].includes(staffData.role)) { router.replace("/hospital/unauthorized"); return; }
    const s = staffData as Staff; setStaff(s);
    let doctorQuery = supabase.from("doctors").select("id").eq("hospital_id", s.hospital_id);
    if (s.role === "doctor") doctorQuery = doctorQuery.eq("profile_id", user.id);
    const { data: doctor } = await doctorQuery.maybeSingle();
    if (doctor) {
      const start = new Date(); start.setHours(0,0,0,0); const end = new Date(); end.setHours(23,59,59,999);
      const { data, error: e } = await supabase.from("appointments").select("id,patient_id,scheduled_for,status,patient_report").eq("hospital_id", s.hospital_id).eq("assigned_doctor_id", doctor.id).gte("scheduled_for", start.toISOString()).lte("scheduled_for", end.toISOString()).order("scheduled_for");
      if (e) setError("Les rendez-vous sont prêts côté interface, mais les permissions Supabase doivent encore être renforcées pour permettre leur lecture au médecin.");
      setAppointments((data || []) as Appointment[]);
    }
    setLoading(false);
  }
  async function logout(){ await supabase.auth.signOut(); router.replace("/hospital/login"); }
  if (loading) return <main className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" /></main>;
  if (!staff) return null;
  const pending=appointments.filter(a=>["pending","validated","in_progress"].includes(a.status)).length; const completed=appointments.filter(a=>a.status==="completed").length;
  return <main className="min-h-screen bg-[#f5f7fb] text-slate-900"><div className="flex min-h-screen">
    <aside className="hidden w-[260px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col"><div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><Activity size={21}/></div><div><b>CareLink</b><p className="text-[10px] font-bold tracking-[.16em] text-slate-400">HÔPITAL</p></div></div><nav className="space-y-1 p-4"><Nav active icon={<Stethoscope size={18}/>} label="Tableau de bord"/><Nav icon={<CalendarDays size={18}/>} label="Planning"/><Nav icon={<UserRound size={18}/>} label="Patients"/><Nav icon={<ClipboardList size={18}/>} label="Consultations"/><Nav icon={<Pill size={18}/>} label="Ordonnances"/></nav><div className="mt-auto border-t border-slate-100 p-4"><div className="rounded-xl bg-slate-50 p-3"><p className="truncate text-sm font-bold">{staff.display_name||"Médecin"}</p><p className="text-xs text-slate-400">Espace médecin</p><button onClick={logout} className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900"><LogOut size={15}/> Déconnexion</button></div></div></aside>
    <section className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl sm:px-8"><div><p className="text-xs text-slate-400">CareLink Hôpital / Médecin</p><h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Bonjour, {staff.display_name||"Docteur"}</h1></div><div className="flex items-center gap-3"><span className="hidden rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 sm:block">● Système opérationnel</span><button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"><Bell size={18}/><i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500"/></button></div></header>
    <div className="mx-auto max-w-[1500px] space-y-7 p-5 sm:p-8"><section className="rounded-2xl bg-slate-950 p-6 text-white shadow-[0_20px_60px_-25px_rgba(15,23,42,.45)] sm:p-8"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-center"><div><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-bold"><Stethoscope size={13}/> Consultation médicale</span><h2 className="mt-4 text-2xl font-bold sm:text-3xl">Votre journée médicale, au même endroit.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Retrouvez les patients affectés, ouvrez leur dossier et finalisez la consultation directement.</p></div><Link href="/hospital" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"><ArrowLeft size={16}/> Espace hôpital</Link></div></section>
    {error&&<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-3"><Stat icon={<CalendarDays size={19}/>} label="Patients aujourd’hui" value={String(appointments.length)}/><Stat icon={<Clock3 size={19}/>} label="À prendre en charge" value={String(pending)}/><Stat icon={<CheckCircle2 size={19}/>} label="Consultations terminées" value={String(completed)}/></section>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold">Patients du jour</h3><p className="mt-1 text-xs text-slate-400">Dossiers affectés à votre agenda</p></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-400"><Search size={15}/> Rechercher un patient</div></div><div className="divide-y divide-slate-100">{appointments.length===0?<div className="p-12 text-center"><FileText className="mx-auto text-slate-300" size={34}/><p className="mt-3 font-semibold">Aucun patient programmé</p><p className="mt-1 text-sm text-slate-400">Les dossiers affectés apparaîtront ici.</p></div>:appointments.map(a=><div key={a.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound size={18}/></div><div><p className="font-semibold">Patient {a.patient_id.slice(0,8)}</p><p className="mt-1 text-xs text-slate-400">{a.patient_report||"Aucun motif renseigné"}</p></div></div><div className="text-xs font-semibold text-slate-500">{a.scheduled_for?new Date(a.scheduled_for).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"—"}</div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">{a.status}</span><button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Ouvrir <ChevronRight size={14}/></button></div>)}</div></section>
    <section className="grid gap-4 md:grid-cols-3"><Quick icon={<ClipboardList size={18}/>} title="Consultation" text="Saisir les notes et constantes"/><Quick icon={<FileText size={18}/>} title="Compte-rendu" text="Préparer le rapport médical"/><Quick icon={<Pill size={18}/>} title="Ordonnance" text="Créer une prescription électronique"/></section></div></section></div></main>;
}
function Nav({icon,label,active=false}:{icon:React.ReactNode;label:string;active?:boolean}){return <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active?"bg-slate-950 text-white":"text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>{icon}<span>{label}</span></button>}
function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{icon}</div><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>}
function Quick({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <button className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{icon}</div><p className="mt-4 font-bold">{title}</p><p className="mt-1 text-xs text-slate-400">{text}</p></button>}
