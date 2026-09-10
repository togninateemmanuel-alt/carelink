"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Shield,
  CreditCard,
  CheckCircle2,
  Stethoscope,
  FileText,
  AlertCircle,
  Calendar,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "14:00", "14:30", "15:00",
  "15:30", "16:00", "16:30", "17:00", "17:30",
];

export default function HospitalAppointmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"view" | "validate" | "prescribe">("view");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Validation + créneau
  const [validatorName, setValidatorName] = useState("");
  const [observation, setObservation] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);

  // Prescription
  const [doctorName, setDoctorName] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [doctorSignature, setDoctorSignature] = useState("");
  const [doctorStamp, setDoctorStamp] = useState("");
  const [temperature, setTemperature] = useState("");
  const [bpm, setBpm] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [medications, setMedications] = useState("");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    loadAppointment();
  }, [id]);

  useEffect(() => {
    if (scheduleDate && appointment?.hospital_id) {
      loadOccupiedSlots(scheduleDate);
    }
  }, [scheduleDate, appointment?.hospital_id]);

  const loadAppointment = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("appointments")
      .select(
        `*, profiles!appointments_patient_id_fkey(full_name, phone, email),
         hospitals(name, consultation_price)`
      )
      .eq("id", id)
      .single();

    if (error) {
      const { data: simple } = await supabase
        .from("appointments")
        .select("*, hospitals(name)")
        .eq("id", id)
        .single();
      setAppointment(simple);
    } else {
      setAppointment(data);
    }
    setLoading(false);
  };

  const loadOccupiedSlots = async (dateStr: string) => {
    const supabase = createClient();
    const dayStart = new Date(dateStr);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateStr);
    dayEnd.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("appointments")
      .select("scheduled_at, duration_minutes")
      .eq("hospital_id", appointment.hospital_id)
      .not("scheduled_at", "is", null)
      .gte("scheduled_at", dayStart.toISOString())
      .lte("scheduled_at", dayEnd.toISOString())
      .not("status", "eq", "cancelled")
      .neq("id", id);

    const occupied: string[] = [];
    (data || []).forEach((a: any) => {
      const start = new Date(a.scheduled_at);
      const h = start.getHours().toString().padStart(2, "0");
      const m = start.getMinutes().toString().padStart(2, "0");
      occupied.push(`${h}:${m}`);
    });
    setOccupiedSlots(occupied);
  };

  const handleValidate = async () => {
    if (!validatorName.trim()) {
      setError("Indiquez le nom du responsable.");
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      setError("Choisissez une date et une heure de consultation.");
      return;
    }
    if (occupiedSlots.includes(scheduleTime)) {
      setError("Ce créneau est déjà occupé. Choisissez une autre heure.");
      return;
    }

    setSaving(true);
    setError("");

    const supabase = createClient();

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);

    let queueNum = appointment.queue_number;
    if (!queueNum) {
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", appointment.hospital_id)
        .eq("status", "validated");
      queueNum = (count || 0) + 1;
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        status: "validated",
        queue_number: queueNum,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: 20,
        hospital_validated_at: new Date().toISOString(),
        hospital_validator_name: validatorName,
        hospital_observation: observation || null,
      })
      .eq("id", id);

    setSaving(false);

    if (updateError) {
      console.error(updateError);
      setError("Erreur lors de la validation. Vérifiez que la migration SQL a été exécutée.");
      return;
    }

    setMessage(
      `Dossier validé — RDV fixé le ${scheduleDate} à ${scheduleTime}.`
    );
    setMode("view");
    loadAppointment();
  };

  const handlePrescribe = async () => {
    if (!doctorName.trim() || !medications.trim()) {
      setError("Nom du médecin et médicaments sont obligatoires.");
      return;
    }
    setSaving(true);
    setError("");

    const supabase = createClient();

    const { error: prescError } = await supabase.from("prescriptions").insert({
      appointment_id: id,
      patient_id: appointment.patient_id,
      temperature: temperature || null,
      bpm: bpm || null,
      blood_pressure: bloodPressure || null,
      medications,
      instructions: instructions || null,
      doctor_name: doctorName,
      doctor_phone: doctorPhone || null,
      doctor_signature: doctorSignature || doctorName,
      doctor_stamp: doctorStamp || `CACHET ${doctorName.toUpperCase()}`,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    if (prescError) {
      console.error(prescError);
      setError("Erreur lors de l'enregistrement de l'ordonnance.");
      setSaving(false);
      return;
    }

    await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", id);

    setSaving(false);
    setMessage("Ordonnance envoyée au patient.");
    setMode("view");
    loadAppointment();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="card text-center">
          <p className="text-text-secondary">Dossier introuvable</p>
          <Link href="/hospital" className="btn-primary mt-4 inline-flex">
            Retour
          </Link>
        </div>
      </div>
    );
  }

  const patientName = appointment.profiles?.full_name || "Patient";
  const hospitalName = appointment.hospitals?.name || "Hôpital";
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
        <Link href="/hospital" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">Dossier patient</h1>
      </header>

      <main className="px-5 pt-5 space-y-5">
        {message && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-success-light text-success text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
            <p>{message}</p>
          </div>
        )}

        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-bold text-text-primary text-lg">{patientName}</h2>
              <p className="text-sm text-text-secondary">
                {appointment.profiles?.phone || "Téléphone non renseigné"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
            <div>
              <p className="text-text-secondary">Consultation</p>
              <p className="font-medium">{appointment.consultation_type}</p>
            </div>
            <div>
              <p className="text-text-secondary">Statut</p>
              <p className="font-medium capitalize">{appointment.status}</p>
            </div>
            <div>
              <p className="text-text-secondary">Hôpital</p>
              <p className="font-medium">{hospitalName}</p>
            </div>
            <div>
              <p className="text-text-secondary">N° de file</p>
              <p className="font-medium">
                {appointment.queue_number ? `N° ${appointment.queue_number}` : "—"}
              </p>
            </div>
          </div>

          {appointment.scheduled_at && (
            <div className="flex items-center gap-2 pt-2 border-t border-border text-sm">
              <Calendar className="w-4 h-4 text-primary" strokeWidth={1.75} />
              <span className="font-medium text-primary">
                {new Date(appointment.scheduled_at).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <p className="text-text-secondary text-sm mb-1">Symptômes</p>
            <p className="text-sm leading-relaxed">{appointment.symptoms}</p>
          </div>

          <div className="flex items-center gap-4 text-sm pt-2 border-t border-border">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Shield className="w-4 h-4" strokeWidth={1.75} />
              {appointment.has_insurance
                ? appointment.insurance_company
                : "Sans assurance"}
            </span>
            <span className="flex items-center gap-1.5 text-text-secondary">
              <CreditCard className="w-4 h-4" strokeWidth={1.75} />
              {appointment.remaining_amount} F CFA
            </span>
          </div>
        </div>

        {appointment.status === "pending" && mode === "view" && (
          <button onClick={() => setMode("validate")} className="btn-success w-full">
            <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
            Valider et fixer un créneau
          </button>
        )}

        {(appointment.status === "validated" || appointment.status === "in_progress") &&
          mode === "view" && (
            <button onClick={() => setMode("prescribe")} className="btn-primary w-full">
              <Stethoscope className="w-5 h-5" strokeWidth={1.75} />
              Commencer la consultation
            </button>
          )}

        {/* Validation + choix créneau */}
        {mode === "validate" && (
          <div className="card space-y-4">
            <h3 className="font-semibold text-text-primary">
              Validation & créneau horaire
            </h3>

            <Input
              id="validatorName"
              label="Nom du responsable"
              placeholder="Ex : Dr Koffi"
              value={validatorName}
              onChange={(e) => setValidatorName(e.target.value)}
            />

            <div>
              <label className="label flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />
                Date de consultation
              </label>
              <input
                type="date"
                min={todayStr}
                value={scheduleDate}
                onChange={(e) => {
                  setScheduleDate(e.target.value);
                  setScheduleTime("");
                }}
                className="input"
              />
            </div>

            {scheduleDate && (
              <div>
                <label className="label flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />
                  Heure disponible
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isOccupied = occupiedSlots.includes(slot);
                    const isSelected = scheduleTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => setScheduleTime(slot)}
                        className={cn(
                          "py-2.5 rounded-button text-sm font-medium border transition",
                          isOccupied &&
                            "bg-slate-100 text-text-muted border-border line-through cursor-not-allowed",
                          isSelected &&
                            !isOccupied &&
                            "bg-primary text-white border-primary",
                          !isSelected &&
                            !isOccupied &&
                            "bg-white text-text-primary border-border hover:border-primary"
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Les créneaux barrés sont déjà occupés.
                </p>
                <Link
                  href="/hospital/calendar"
                  className="text-xs text-primary font-medium mt-1 inline-block"
                >
                  Voir le calendrier complet →
                </Link>
              </div>
            )}

            <Textarea
              id="observation"
              label="Observation (optionnel)"
              placeholder="Notes..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />

            {error && (
              <div className="flex items-start gap-2 text-sm text-danger">
                <AlertCircle className="w-4 h-4 mt-0.5" strokeWidth={1.75} />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setMode("view")} className="btn-outline flex-1">
                Annuler
              </button>
              <button
                onClick={handleValidate}
                disabled={saving}
                className="btn-success flex-1"
              >
                {saving ? "..." : "Valider le créneau"}
              </button>
            </div>
          </div>
        )}

        {/* Prescription */}
        {mode === "prescribe" && (
          <div className="card space-y-4">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Stethoscope className="w-5 h-5" strokeWidth={1.75} />
              Consultation & Ordonnance
            </h3>

            <Input
              id="doctorName"
              label="Nom du médecin"
              placeholder="Ex : Dr Koffi Jean"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />
            <Input
              id="doctorPhone"
              label="Téléphone du médecin"
              type="tel"
              placeholder="Ex : 90 00 00 00"
              value={doctorPhone}
              onChange={(e) => setDoctorPhone(e.target.value)}
            />

            <div className="grid grid-cols-3 gap-3">
              <Input
                id="temperature"
                label="Température"
                placeholder="37.2"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
              <Input
                id="bpm"
                label="Pouls"
                placeholder="75"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
              />
              <Input
                id="bloodPressure"
                label="Tension"
                placeholder="120/80"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
              />
            </div>

            <Textarea
              id="medications"
              label="Médicaments prescrits"
              placeholder={
                "Paracétamol 500 mg — 2 comprimés/jour\nAmoxicilline 500 mg — 1 matin et soir\nDurée : 5 jours"
              }
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
            />

            <Textarea
              id="instructions"
              label="Instructions"
              placeholder="Conseils pour le patient..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />

            <Input
              id="doctorSignature"
              label="Signature"
              placeholder="Nom / signature"
              value={doctorSignature}
              onChange={(e) => setDoctorSignature(e.target.value)}
            />
            <Input
              id="doctorStamp"
              label="Cachet"
              placeholder="Ex : CACHET DR KOFFI"
              value={doctorStamp}
              onChange={(e) => setDoctorStamp(e.target.value)}
            />

            {error && (
              <div className="flex items-start gap-2 text-sm text-danger">
                <AlertCircle className="w-4 h-4 mt-0.5" strokeWidth={1.75} />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setMode("view")} className="btn-outline flex-1">
                Annuler
              </button>
              <button
                onClick={handlePrescribe}
                disabled={saving}
                className="btn-primary flex-1"
              >
                <FileText className="w-5 h-5" strokeWidth={1.75} />
                {saving ? "Envoi..." : "Envoyer l'ordonnance"}
              </button>
            </div>
          </div>
        )}

        {appointment.status === "completed" && mode === "view" && (
          <div className="card bg-success-light border border-success/20 text-sm text-success">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
              <span className="font-medium">
                Consultation terminée — ordonnance envoyée
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
