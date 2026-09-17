"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Monitor, ShieldCheck, Clock3, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateDeviceId } from "@/lib/carelink/hospital/device";

export default function HospitalActivatePage() {
  const [deviceId, setDeviceId] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    loadDevice(id);
  }, []);

  async function loadDevice(id: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("hospital_devices")
      .select("status")
      .eq("device_id", id)
      .maybeSingle();

    if (data?.status) setStatus(data.status);
    setLoading(false);
  }

  async function registerDevice() {
    if (!deviceId) return;
    setLoading(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      setLoading(false);
      return;
    }

    const { data: staff } = await supabase
      .from("hospital_staff")
      .select("hospital_id")
      .eq("profile_id", auth.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff?.hospital_id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("hospital_devices")
      .upsert(
        {
          hospital_id: staff.hospital_id,
          device_id: deviceId,
          device_name: `Ordinateur ${deviceId.slice(-4)}`,
          status: "pending",
        },
        { onConflict: "device_id" }
      )
      .select("status")
      .single();

    if (!error && data) setStatus(data.status);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-background px-5 py-12">
      <div className="max-w-xl mx-auto">
        <Link href="/hospital/admin" className="inline-flex items-center gap-2 text-sm text-text-secondary mb-6">
          <ArrowLeft className="w-4 h-4" /> Administration
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Cet ordinateur</h1>
          <p className="text-text-secondary mt-2">L'ordinateur sera ajouté automatiquement à la liste des appareils de l'hôpital.</p>
        </div>

        <div className="card space-y-5">
          <div>
            <p className="text-sm text-text-secondary">Identifiant de l'ordinateur</p>
            <p className="font-mono font-semibold text-text-primary mt-1 break-all">{deviceId || "Génération…"}</p>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
            {status === "active" ? <ShieldCheck className="w-6 h-6 text-success" /> : <Clock3 className="w-6 h-6 text-warning" />}
            <div>
              <p className="font-semibold text-text-primary">
                {status === "active" ? "Ordinateur autorisé" : status === "blocked" ? "Ordinateur bloqué" : "En attente d'autorisation"}
              </p>
              <p className="text-sm text-text-secondary">
                {status === "active" ? "Cet ordinateur peut utiliser la section qui lui est attribuée." : "L'administrateur doit choisir les accès de ce poste."}
              </p>
            </div>
          </div>

          {status !== "active" && (
            <button onClick={registerDevice} disabled={loading || !deviceId} className="btn-primary w-full">
              {loading ? "Enregistrement…" : "Enregistrer cet ordinateur"}
            </button>
          )}
        </div>

        <p className="text-xs text-text-muted text-center mt-5">
          La licence appartient à l'organisation de l'hôpital : elle n'est pas saisie à nouveau sur chaque ordinateur.
        </p>
      </div>
    </main>
  );
}
