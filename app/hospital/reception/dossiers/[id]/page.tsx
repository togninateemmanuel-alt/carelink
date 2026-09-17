"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Loader2, Route, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type A = {
  id: string;
  patient_id: string;
  hospital_id: string;
  symptoms: string | null;
  patient_report: string | null;
  status: string;
  scheduled_for: string | null;
  reception_desk_id: string | null;
  specialty_id: string | null;
  assigned_doctor_id: string | null;
};
type D = { id: string; name: string; code: string };
type S = { id: string; name: string; code: string };
type Doc = {
  id: string;
  display_name: string | null;
  specialty: string | null;
  specialty_id: string | null;
  is_available: boolean;
};
type M = { reception_desk_id: string; specialty_id: string | null; symptom_name: string };

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const sb = createClient();
  const [a, setA] = useState<A | null>(null);
  const [name, setName] = useState("");
  const [ds, setDs] = useState<D[]>([]);
  const [ss, setSs] = useState<S[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [desk, setDesk] = useState("");
  const [spec, setSpec] = useState("");
  const [doc, setDoc] = useState("");
  const [when, setWhen] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      location.href = "/hospital/login";
      return;
    }
    const { data: st } = await sb
      .from("hospital_staff")
      .select("id,hospital_id,role")
      .eq("profile_id", user.id)
      .eq("is_active", true)
      .in("role", ["reception", "hospital_admin"])
      .maybeSingle();
    if (!st) {
      location.href = "/hospital/unauthorized";
      return;
    }
    const { data: x } = await sb
      .from("appointments")
      .select(
        "id,patient_id,hospital_id,symptoms,patient_report,status,scheduled_for,reception_desk_id,specialty_id,assigned_doctor_id"
      )
      .eq("id", id)
      .eq("hospital_id", st.hospital_id)
      .maybeSingle();
    if (!x) {
      setMsg("Dossier introuvable.");
      setLoading(false);
      return;
    }
    setA(x as A);
    const [{ data: d }, { data: s }, { data: dc }, { data: p }, { data: m }] =
      await Promise.all([
        sb
          .from("reception_desks")
          .select("id,name,code")
          .eq("hospital_id", st.hospital_id)
          .eq("is_active", true)
          .order("name"),
        sb
          .from("specialties")
          .select("id,name,code")
          .eq("hospital_id", st.hospital_id)
          .eq("is_active", true)
          .order("name"),
        sb
          .from("doctors")
          .select("id,display_name,specialty,specialty_id,is_available")
          .eq("hospital_id", st.hospital_id)
          .order("display_name"),
        sb.from("profiles").select("full_name").eq("id", x.patient_id).maybeSingle(),
        sb
          .from("reception_symptoms")
          .select("reception_desk_id,specialty_id,symptom_name")
          .eq("is_active", true),
      ]);
    setDs(d || []);
    setSs(s || []);
    setDocs(dc || []);
    setName(p?.full_name || "");
    setDesk(x.reception_desk_id || "");
    setSpec(x.specialty_id || "");
    setDoc(x.assigned_doctor_id || "");
    if (x.scheduled_for) setWhen(new Date(x.scheduled_for).toISOString().slice(0, 16));
    const text = (x.symptoms || x.patient_report || "").toLowerCase();
    const hit = ((m || []) as M[]).find((v) =>
      text.includes(v.symptom_name.toLowerCase())
    );
    if (hit) {
      if (!x.reception_desk_id) setDesk(hit.reception_desk_id);
      if (hit.specialty_id && !x.specialty_id) setSpec(hit.specialty_id);
    }
    setLoading(false);
  }

  const filtered = useMemo(
    () => docs.filter((d) => d.is_available !== false && (!spec || d.specialty_id === spec)),
    [docs, spec]
  );

  async function save() {
    if (!a) return;
    setMsg("");
    if (!desk || !spec || !when) {
      setMsg("Sélectionnez l'accueil, la spécialité et la date/heure.");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await sb.auth.getUser();
    const { data: st } = await sb
      .from("hospital_staff")
      .select("id")
      .eq("profile_id", user?.id || "")
      .eq("hospital_id", a.hospital_id)
      .eq("is_active", true)
      .in("role", ["reception", "hospital_admin"])
      .maybeSingle();
    if (!st) {
      setMsg("Poste non autorisé.");
      setSaving(false);
      return;
    }
    const { error } = await sb
      .from("appointments")
      .update({
        reception_desk_id: desk,
        specialty_id: spec,
        assigned_doctor_id: doc || null,
        assigned_receptionist_id: st.id,
        scheduled_for: new Date(when).toISOString(),
        status: "validated",
        hospital_validated_at: new Date().toISOString(),
        hospital_validator_name: "Accueil",
      })
      .eq("id", a.id)
      .eq("hospital_id", a.hospital_id);
    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }
    setMsg("Dossier validé et rendez-vous programmé.");
    setSaving(false);
    load();
  }

  if (loading)
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </main>
    );

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-5 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/hospital/reception/dossiers"
          className="inline-flex items-center gap-2 text-sm text-slate-500"
        >
          <ArrowLeft size={16} />
          Dossiers patients
        </Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Dossier patient
            </p>
            <h1 className="mt-2 text-2xl font-bold">
              {name || `Patient ${a?.patient_id.slice(0, 8)}`}
            </h1>
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <FileText size={16} />
                Motif / symptômes
              </div>
              <p className="mt-2 text-sm leading-6">{a?.symptoms || "Non renseigné"}</p>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <UserRound size={16} />
                Compte-rendu patient
              </div>
              <p className="mt-2 text-sm leading-6">{a?.patient_report || "Aucun"}</p>
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Route size={19} />
              </div>
              <div>
                <h2 className="font-bold">Orientation & rendez-vous</h2>
                <p className="text-xs text-slate-400">Le dossier sera transmis au médecin.</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <Field label="Accueil">
                <select value={desk} onChange={(e) => setDesk(e.target.value)}>
                  <option value="">Choisir</option>
                  {ds.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} — {x.code}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Spécialité">
                <select
                  value={spec}
                  onChange={(e) => {
                    setSpec(e.target.value);
                    setDoc("");
                  }}
                >
                  <option value="">Choisir</option>
                  {ss.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} — {x.code}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Médecin">
                <select value={doc} onChange={(e) => setDoc(e.target.value)}>
                  <option value="">Attribuer plus tard</option>
                  {filtered.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.display_name || "Médecin"}
                      {x.specialty ? ` — ${x.specialty}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date et heure">
                <input
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </Field>
              <button
                onClick={save}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={17} />
                )}
                Valider et programmer
              </button>
              {msg && (
                <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold">{msg}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold">
      <span className="mb-1.5 block text-slate-600">{label}</span>
      {children}
    </label>
  );
}
