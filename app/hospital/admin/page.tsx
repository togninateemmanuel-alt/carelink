"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Monitor, Shield, Ban, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Device {
  id: string;
  device_id: string;
  device_name: string | null;
  workstation_type: "admin" | "reception" | "doctor";
  status: "pending" | "active" | "blocked" | "revoked";
  last_seen_at: string | null;
}

export default function HospitalAdminPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => { loadDevices(); }, []);

  async function loadDevices() {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }

    const { data: staff } = await supabase
      .from("hospital_staff")
      .select("hospital_id, role")
      .eq("profile_id", auth.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff || staff.role !== "hospital_admin") { setLoading(false); return; }

    const { data } = await supabase
      .from("hospital_devices")
      .select("id, device_id, device_name, workstation_type, status, last_seen_at")
      .eq("hospital_id", staff.hospital_id)
      .order("created_at", { ascending: false });

    setDevices((data || []) as Device[]);
    setLoading(false);
  }

  async function authorize(device: Device, type: Device["workstation_type"]) {
    setMessage("");
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data: staff } = await supabase
      .from("hospital_staff")
      .select("id, hospital_id, role")
      .eq("profile_id", auth.user.id)
      .eq("role", "hospital_admin")
      .eq("is_active", true)
      .maybeSingle();
    if (!staff) return;

    const { error } = await supabase
      .from("hospital_devices")
      .update({
        status: "active",
        workstation_type: type,
        authorized_at: new Date().toISOString(),
        authorized_by: staff.id,
      })
      .eq("id", device.id)
      .eq("hospital_id", staff.hospital_id);

    if (error) setMessage("Autorisation impossible. Vérifiez les permissions Supabase.");
    else await loadDevices();
  }

  async function setStatus(device: Device, status: "blocked" | "revoked") {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: staff } = await supabase.from("hospital_staff").select("id, hospital_id, role").eq("profile_id", auth.user.id).eq("role", "hospital_admin").eq("is_active", true).maybeSingle();
    if (!staff) return;
    await supabase.from("hospital_devices").update({ status, revoked_at: status === "revoked" ? new Date().toISOString() : null }).eq("id", device.id).eq("hospital_id", staff.hospital_id);
    await loadDevices();
  }

  const statusLabel = (status: Device["status"]) => ({ pending: "En attente", active: "Actif", blocked: "Bloqué", revoked: "Révoqué" })[status];
  const typeLabel = (type: Device["workstation_type"]) => ({ admin: "Administrateur", reception: "Accueil", doctor: "Médecin" })[type];

  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="max-w-5xl mx-auto">
        <Link href="/hospital" className="inline-flex items-center gap-2 text-sm text-text-secondary mb-6"><ArrowLeft className="w-4 h-4" /> Espace hôpital</Link>
        <div className="flex items-start justify-between gap-4 mb-8">
          <div><p className="text-sm font-medium text-primary">Administration</p><h1 className="text-3xl font-bold text-text-primary mt-2">Ordinateurs</h1><p className="text-text-secondary mt-2">Autorisez et gérez les postes connectés à l'organisation.</p></div>
          <Link href="/hospital/activate" className="btn-primary">Ajouter cet ordinateur</Link>
        </div>

        {message && <div className="card mb-5 text-sm text-danger">{message}</div>}
        {loading ? <div className="text-text-secondary">Chargement des ordinateurs…</div> : devices.length === 0 ? <div className="card text-center py-12"><Monitor className="w-10 h-10 mx-auto text-text-muted mb-3" /><p className="font-semibold text-text-primary">Aucun ordinateur enregistré</p><p className="text-sm text-text-secondary mt-1">Un poste apparaîtra ici après son enregistrement.</p></div> : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.id} className="card">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="flex gap-4 items-start"><div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><Monitor className="w-5 h-5 text-primary" /></div><div><p className="font-semibold text-text-primary">{device.device_name || "Ordinateur"}</p><p className="font-mono text-xs text-text-muted mt-1">{device.device_id}</p><div className="flex gap-2 mt-2 text-xs"><span className="px-2 py-1 rounded-full bg-slate-100">{typeLabel(device.workstation_type)}</span><span className="px-2 py-1 rounded-full bg-slate-100 flex items-center gap-1">{device.status === "active" ? <Check className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}{statusLabel(device.status)}</span></div></div></div>
                  {device.status === "pending" && <div className="flex flex-wrap gap-2"><button onClick={() => authorize(device, "reception")} className="btn-primary">Autoriser Accueil</button><button onClick={() => authorize(device, "doctor")} className="px-4 py-2 rounded-lg border border-border text-sm font-medium">Autoriser Médecin</button><button onClick={() => authorize(device, "admin")} className="px-4 py-2 rounded-lg border border-border text-sm font-medium">Autoriser Admin</button></div>}
                  {device.status === "active" && <div className="flex gap-2"><button onClick={() => setStatus(device, "blocked")} className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-2"><Ban className="w-4 h-4" /> Bloquer</button><button onClick={() => setStatus(device, "revoked")} className="px-3 py-2 rounded-lg border border-danger/30 text-danger text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Révoquer</button></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
