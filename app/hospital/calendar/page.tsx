"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Calendar as CalendarIcon,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface SlotAppointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  consultation_type: string;
  queue_number: number | null;
  profiles: { full_name: string } | null;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8h → 18h
const WEEKDAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Lundi = début
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHour(h: number) {
  return `${h.toString().padStart(2, "0")}:00`;
}

export default function HospitalCalendarPage() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState<SlotAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  useEffect(() => {
    loadAppointments();
  }, [weekStart]);

  const loadAppointments = async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?redirect=/hospital/calendar");
      return;
    }

    const from = weekStart.toISOString();
    const to = addDays(weekStart, 7).toISOString();

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `id, scheduled_at, duration_minutes, status, consultation_type, queue_number,
         profiles!appointments_patient_id_fkey(full_name)`
      )
      .not("scheduled_at", "is", null)
      .gte("scheduled_at", from)
      .lt("scheduled_at", to)
      .not("status", "eq", "cancelled")
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error(error);
      // Fallback sans jointure
      const { data: simple } = await supabase
        .from("appointments")
        .select("id, scheduled_at, duration_minutes, status, consultation_type, queue_number")
        .not("scheduled_at", "is", null)
        .gte("scheduled_at", from)
        .lt("scheduled_at", to)
        .not("status", "eq", "cancelled")
        .order("scheduled_at", { ascending: true });
      setAppointments((simple as any) || []);
    } else {
      setAppointments((data as any) || []);
    }
    setLoading(false);
  };

  const getSlotsForDay = (day: Date) => {
    return appointments.filter((a) => {
      if (!a.scheduled_at) return false;
      return sameDay(new Date(a.scheduled_at), day);
    });
  };

  const isHourOccupied = (day: Date, hour: number) => {
    return getSlotsForDay(day).some((a) => {
      const start = new Date(a.scheduled_at);
      const end = new Date(start.getTime() + (a.duration_minutes || 20) * 60000);
      const slotStart = new Date(day);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(day);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      return start < slotEnd && end > slotStart;
    });
  };

  const getAppointmentAtHour = (day: Date, hour: number) => {
    return getSlotsForDay(day).find((a) => {
      const start = new Date(a.scheduled_at);
      return start.getHours() === hour;
    });
  };

  const daySlots = getSlotsForDay(selectedDay);
  const today = new Date();

  const weekLabel = `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS_FR[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-surface px-5 pt-12 pb-4 sticky top-0 z-10 shadow-soft">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/hospital" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Calendrier</h1>
            <p className="text-xs text-text-secondary">Créneaux occupés & disponibles</p>
          </div>
        </div>

        {/* Navigation semaine */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="p-2 rounded-full hover:bg-slate-100"
          >
            <ChevronLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
          </button>
          <span className="text-sm font-medium text-text-primary">{weekLabel}</span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="p-2 rounded-full hover:bg-slate-100"
          >
            <ChevronRight className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
          </button>
        </div>

        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 gap-1 mt-4">
          {weekDays.map((day) => {
            const isSelected = sameDay(day, selectedDay);
            const isToday = sameDay(day, today);
            const count = getSlotsForDay(day).length;

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex flex-col items-center py-2 rounded-xl text-xs transition",
                  isSelected
                    ? "bg-primary text-white"
                    : isToday
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-slate-50"
                )}
              >
                <span className="font-medium">{WEEKDAYS_FR[day.getDay()]}</span>
                <span className="text-base font-bold mt-0.5">{day.getDate()}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1",
                      isSelected ? "bg-white" : "bg-primary"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-5 pt-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">
            {WEEKDAYS_FR[selectedDay.getDay()]} {selectedDay.getDate()}{" "}
            {MONTHS_FR[selectedDay.getMonth()]}
          </h2>
          <span className="text-sm text-text-secondary">
            {daySlots.length} consultation{daySlots.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {HOURS.map((hour) => {
              const occupied = isHourOccupied(selectedDay, hour);
              const apt = getAppointmentAtHour(selectedDay, hour);

              return (
                <div
                  key={hour}
                  className={cn(
                    "flex items-stretch gap-3 min-h-[56px]",
                    occupied ? "" : ""
                  )}
                >
                  <div className="w-14 flex-shrink-0 pt-3 text-xs text-text-muted font-medium">
                    {formatHour(hour)}
                  </div>

                  <div
                    className={cn(
                      "flex-1 rounded-xl px-3 py-2.5 border transition",
                      occupied
                        ? "bg-primary/5 border-primary/20"
                        : "bg-white border-dashed border-border"
                    )}
                  >
                    {apt ? (
                      <Link
                        href={`/hospital/appointments/${apt.id}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.75} />
                            <span className="text-sm font-medium text-text-primary truncate">
                              {apt.profiles?.full_name || "Patient"}
                            </span>
                          </div>
                          <span className="text-xs text-text-muted flex-shrink-0">
                            {apt.duration_minutes || 20} min
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5 ml-6">
                          {apt.consultation_type}
                          {apt.queue_number ? ` · N° ${apt.queue_number}` : ""}
                        </p>
                      </Link>
                    ) : occupied ? (
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Clock className="w-4 h-4" strokeWidth={1.75} />
                        Occupé
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        Disponible
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Légende */}
        <div className="mt-6 card flex items-center gap-6 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            Occupé
          </span>
        </div>
      </main>
    </div>
  );
}
