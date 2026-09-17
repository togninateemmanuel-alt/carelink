"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, ClipboardCheck, FileText, HeartPulse, Save, Stethoscope, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";

export default function DoctorConsultationPage() {
  const params = useParams<{ id: string }>(); const router = useRouter(); const supabase = createClient();
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState("");
  const [patient,setPatient]=useState<{full_name:string|null;date_of_birth:string|null;gender:string|null;phone:string|null}|null>(null);
  const [appointment,setAppointment]=useState<{id:string;patient_id:string;patient_report:string|null;scheduled_for:string|null;status:string}|null>(null);
  const [doctorId,setDoctorId]=useState("");
  const [notes,setNotes]=useState(""); const [diagnosis,setDiagnosis]=useState(""); const [analyses,setAnalyses]=useState(""); const [report,setReport]=useState("");
  const [vitals,setVitals]=useState({temperature:"",heartRate:"",bloodPressure:"",weight:""});

  useEffect(()=>{load()},[]);
  async function load(){
    const {data:{user}}=await supabase.auth.getUser(); if(!user){router.replace("/hospital/login");return;}
    const {data:doctor}=await supabase.from("doctors").select("id").eq("profile_id",user.id).maybeSingle(); if(!doctor){router.replace("/hospital/unauthorized");return;} setDoctorId(doctor.id);
    const {data:a,error}=await supabase.from("appointments").select("id,patient_id,patient_report,scheduled_for,status").eq("id",params.id).eq("assigned_doctor_id",doctor.id).maybeSingle();
    if(error||!a){router.replace("/hospital/doctor");return;} setAppointment(a);
    const {data:p}=await supabase.from("profiles").select("full_name,date_of_birth,gender,phone").eq("id",a.patient_id).maybeSingle(); setPatient(p);
    const {data:c}=await supabase.from("consultation_records").select("clinical_notes,diagnosis,analyses,vitals,report").eq("appointment_id",a.id).maybeSingle();
    if(c){setNotes(c.clinical_notes||"");setDiagnosis(c.diagnosis||"");setAnalyses(c.analyses||"");setReport(c.report||"");setVitals({temperature:String(c.vitals?.temperature||""),heartRate:String(c.vitals?.heartRate||""),bloodPressure:String(c.vitals?.bloodPressure||""),weight:String(c.vitals?.weight||"")});}
    setLoading(false);
  }
  async function save(e:FormEvent){e.preventDefault();if(!appointment)return;setSaving(true);setMessage("");
    const payload={appointment_id:appointment.id,hospital_id:null,doctor_id:doctorId,patient_id:appointment.patient_id,clinical_notes:notes,diagnosis,analyses,vitals,report,completed_at:new Date().toISOString()};
    const {data:staff}=await supabase.from("hospital_staff").select("hospital_id").eq("profile_id",(await supabase.auth.getUser()).data.user?.id||"").maybeSingle();
    if(!staff){setMessage("Impossible de déterminer l’hôpital.");setSaving(false);return;} payload.hospital_id=staff.hospital_id;
    const {error}=await supabase.from("consultation_records").upsert(payload,{onConflict:"appointment_id"});
    if(error){setMessage(error.message);setSaving(false);return;}
    const {error:updateError}=await supabase.from("appointments").update({status:"completed",doctor_completed_at:new Date().toISOString()}).eq("id",appointment.id).eq("assigned_doctor_id",doctorId);
    if(updateError){setMessage("Consultation enregistrée, mais le rendez-vous n’a pas pu être clôturé.");}else{setMessage("Consultation enregistrée et dossier clôturé.");setAppointment({...appointment,status:"completed"});}
    setSaving(false);
  }
  if(loading)return <main className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"/></main>;
  if(!appointment)return null;
  return <main className="min-h-screen bg-[#f5f7fb] text-slate-900"><header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-8"><div className="mx-auto flex max-w-6xl items-center justify-between"><div className="flex items-center gap-3"><Link href="/hospital/doctor" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200"><ArrowLeft size={18}/></Link><div><p className="text-xs text-slate-400">CareLink Hôpital / Consultation</p><h1 className="font-bold">Dossier patient</h1></div></div><span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><Activity size={14}/> Consultation sécurisée</span></div></header>
    <form onSubmit={save} className="mx-auto max-w-6xl space-y-5 p-5 sm:p-8"><section className="rounded-2xl bg-slate-950 p-6 text-white"><div className="flex items-start gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><UserRound size={25}/></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Patient</p><h2 className="mt-1 text-2xl font-bold">{patient?.full_name||`Patient ${appointment.patient_id.slice(0,8)}`}</h2><p className="mt-1 text-sm text-slate-400">{patient?.gender||""}{patient?.date_of_birth?` • Né(e) le ${new Date(patient.date_of_birth).toLocaleDateString("fr-FR")}`:""}{patient?.phone?` • ${patient.phone}`:""}</p></div><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold">{appointment.status}</span></div><div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Motif / symptômes</p><p className="mt-1 text-sm leading-6 text-slate-200">{appointment.patient_report||"Aucun motif renseigné"}</p></div></section>
      <section className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><div className="space-y-5"><Card icon={<Stethoscope size={18}/>} title="Observation clinique"><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={7} className="field" placeholder="Décrire les observations, symptômes, examen clinique…"/></Card><Card icon={<HeartPulse size={18}/>} title="Constantes"><div className="grid gap-3 sm:grid-cols-2"><Field label="Température" value={vitals.temperature} setValue={v=>setVitals({...vitals,temperature:v})} placeholder="°C"/><Field label="Fréquence cardiaque" value={vitals.heartRate} setValue={v=>setVitals({...vitals,heartRate:v})} placeholder="bpm"/><Field label="Pression artérielle" value={vitals.bloodPressure} setValue={v=>setVitals({...vitals,bloodPressure:v})} placeholder="mmHg"/><Field label="Poids" value={vitals.weight} setValue={v=>setVitals({...vitals,weight:v})} placeholder="kg"/></div></Card><Card icon={<ClipboardCheck size={18}/>} title="Diagnostic"><textarea value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} rows={5} className="field" placeholder="Diagnostic ou hypothèse diagnostique…"/></Card></div><div className="space-y-5"><Card icon={<FileText size={18}/>} title="Analyses / examens"><textarea value={analyses} onChange={e=>setAnalyses(e.target.value)} rows={8} className="field" placeholder="Analyses demandées, résultats, examens complémentaires…"/></Card><Card icon={<FileText size={18}/>} title="Compte-rendu"><textarea value={report} onChange={e=>setReport(e.target.value)} rows={10} className="field" placeholder="Compte-rendu final destiné au patient…"/></Card></div></section>
      <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between"><div className="text-sm">{message&&<span className={message.includes("enregistrée")?"text-emerald-700 font-semibold":"text-rose-700"}>{message}</span>}</div><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"><Save size={17}/>{saving?"Enregistrement…":"Enregistrer la consultation"}</button></div>
    </form></main>;
}
function Card({icon,title,children}:{icon:React.ReactNode;title:string;children:React.ReactNode}){return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2 font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">{icon}</span>{title}</div>{children}</section>}
function Field({label,value,setValue,placeholder}:{label:string;value:string;setValue:(v:string)=>void;placeholder:string}){return <label className="text-xs font-semibold text-slate-500">{label}<input value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder} className="field mt-1"/></label>}
