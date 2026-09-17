"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Monitor, Shield, Ban, Clock3, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Device {
  id: string; device_id: string; device_name: string | null;
  workstation_type: "admin" | "reception" | "doctor";
  status: "pending" | "active" | "blocked" | "revoked";
  reception_desk_id: string | null; doctor_id: string | null; last_seen_at: string | null;
}
interface Desk { id: string; name: string; code: string; }
interface Doctor { id: string; display_name: string | null; specialty: string | null; }

export default function HospitalAdminPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  useEffect(() => { loadDevices(); }, []);

  async function getAdminStaff() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data: staff } = await supabase.from("hospital_staff").select("id, hospital_id, role").eq("profile_id", auth.user.id).eq("role", "hospital_admin").eq("is_active", true).maybeSingle();
    return staff;
  }

  async function loadDevices() {
    setLoading(true); setMessage("");
    const staff = await getAdminStaff();
    if (!staff) { setLoading(false); return; }
    const [{ data: deviceData }, { data: deskData }, { data: doctorData }] = await Promise.all([
      supabase.from("hospital_devices").select("id, device_id, device_name, workstation_type, status, reception_desk_id, doctor_id, last_seen_at").eq("hospital_id", staff.hospital_id).order("created_at", { ascending: false }),
      supabase.from("reception_desks").select("id, name, code").eq("hospital_id", staff.hospital_id).eq("is_active", true).order("name"),
      supabase.from("doctors").select("id, display_name, specialty").eq("hospital_id", staff.hospital_id).order("display_name")
    ]);
    setDevices((deviceData || []) as Device[]); setDesks((deskData || []) as Desk[]); setDoctors((doctorData || []) as Doctor[]); setLoading(false);
  }

  async function updateDevice(device: Device, patch: Record<string, unknown>) {
    const staff = await getAdminStaff(); if (!staff) return;
    const { error } = await supabase.from("hospital_devices").update(patch).eq("id", device.id).eq("hospital_id", staff.hospital_id);
    if (error) setMessage(`Modification impossible : ${error.message}`); else await loadDevices();
  }

  async function authorize(device: Device, type: Device["workstation_type"]) {
    const patch: Record<string, unknown> = { status: "active", workstation_type: type, authorized_at: new Date().toISOString(), revoked_at: null };
    if (type === "reception") patch.doctor_id = null;
    if (type === "doctor") patch.reception_desk_id = null;
    if (type === "admin") { patch.doctor_id = null; patch.reception_desk_id = null; }
    await updateDevice(device, patch);
  }

  async function setStatus(device: Device, status: "blocked" | "revoked") {
    await updateDevice(device, { status, revoked_at: status === "revoked" ? new Date().toISOString() : null });
  }

  const statusLabel = (s: Device["status"]) => ({ pending: "En attente", active: "Actif", blocked: "Bloqué", revoked: "Révoqué" })[s];
  const typeLabel = (t: Device["workstation_type"]) => ({ admin: "Administrateur", reception: "Accueil", doctor: "Médecin" })[t];

  return <main className="min-h-screen bg-background px-5 py-10"><div className="max-w-5xl mx-auto">
    <Link href="/hospital" className="inline-flex items-center gap-2 text-sm text-text-secondary mb-6"><ArrowLeft className="w-4 h-4" /> Espace hôpital</Link>
    <div className="flex items-start justify-between gap-4 mb-8"><div><p className="text-sm font-medium text-primary">Administration</p><h1 className="text-3xl font-bold text-text-primary mt-2">Ordinateurs</h1><p className="text-text-secondary mt-2">Autorisez, nommez et affectez les postes connectés à l'organisation.</p></div><Link href="/hospital/activate" className="btn-primary">Ajouter cet ordinateur</Link></div>
    {message && <div className="card mb-5 text-sm text-danger">{message}</div>}
    {loading ? <div className="text-text-secondary">Chargement des ordinateurs…</div> : devices.length === 0 ? <div className="card text-center py-12"><Monitor className="w-10 h-10 mx-auto text-text-muted mb-3" /><p className="font-semibold text-text-primary">Aucun ordinateur enregistré</p></div> : <div className="space-y-4">{devices.map(device => <div key={device.id} className="card"><div className="flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div className="flex gap-4 items-start"><div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><Monitor className="w-5 h-5 text-primary" /></div><div><p className="font-semibold text-text-primary">{device.device_name || "Ordinateur"}</p><p className="font-mono text-xs text-text-muted mt-1">{device.device_id}</p><div className="flex gap-2 mt-2 text-xs"><span className="px-2 py-1 rounded-full bg-slate-100">{typeLabel(device.workstation_type)}</span><span className="px-2 py-1 rounded-full bg-slate-100 flex items-center gap-1">{device.status === "active" ? <Check className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}{statusLabel(device.status)}</span></div></div></div>
      {device.status === "pending" && <div className="flex flex-wrap gap-2"><button onClick={() => authorize(device, "reception")} className="btn-primary">Autoriser Accueil</button><button onClick={() => authorize(device, "doctor")} className="px-4 py-2 rounded-lg border border-border text-sm font-medium">Autoriser Médecin</button><button onClick={() => authorize(device, "admin")} className="px-4 py-2 rounded-lg border border-border text-sm font-medium">Autoriser Admin</button></div>}
      {device.status === "active" && <div className="flex gap-2"><button onClick={() => setStatus(device, "blocked")} className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-2"><Ban className="w-4 h-4" /> Bloquer</button><button onClick={() => setStatus(device, "revoked")} className="px-3 py-2 rounded-lg border border-danger/30 text-danger text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Révoquer</button></div>}</div>
      {device.status === "active" && <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-border pt-4"><label className="text-sm"><span className="block text-text-secondary mb-1">Nom du poste</span><input className="w-full rounded-lg border border-border bg-background px-3 py-2" defaultValue={device.device_name || ""} onBlur={e => e.target.value !== (device.device_name || "") && updateDevice(device, { device_name: e.target.value || null })} /></label><label className="text-sm"><span className="block text-text-secondary mb-1">Réception</span><select className="w-full rounded-lg border border-border bg-background px-3 py-2" value={device.reception_desk_id || ""} onChange={e => updateDevice(device, { reception_desk_id: e.target.value || null, doctor_id: null })} disabled={device.workstation_type !== "reception"}><option value="">Aucune</option>{desks.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}</select></label><label className="text-sm"><span className="block text-text-secondary mb-1">Médecin</span><select className="w-full rounded-lg border border-border bg-background px-3 py-2" value={device.doctor_id || ""} onChange={e => updateDevice(device, { doctor_id: e.target.value || null, reception_desk_id: null })} disabled={device.workstation_type !== "doctor"}><option value="">Aucun</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.display_name || "Médecin"}{d.specialty ? ` — ${d.specialty}` : ""}</option>)}</select></label></div>}
    </div></div>)}</div>}
  </div></main>;
}
