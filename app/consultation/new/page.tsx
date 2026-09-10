"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  ClipboardList,
  Stethoscope,
  ArrowRight,
} from "lucide-react";
import { Stepper } from "@/components/ui/Stepper";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

const consultationTypes = [
  { value: "Consultation générale", label: "Consultation générale" },
  { value: "Dentiste", label: "Dentiste" },
  { value: "Pédiatrie", label: "Pédiatrie" },
  { value: "Cardiologie", label: "Cardiologie" },
  { value: "Dermatologie", label: "Dermatologie" },
  { value: "Autre", label: "Autre" },
];

export default function NewConsultationPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    symptoms: "",
    consultationType: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.fullName.trim()) newErrors.fullName = "Le nom complet est requis";
    if (!form.phone.trim()) newErrors.phone = "Le numéro de téléphone est requis";
    else if (form.phone.replace(/\s/g, "").length < 8)
      newErrors.phone = "Numéro de téléphone invalide";
    if (!form.symptoms.trim()) newErrors.symptoms = "Veuillez décrire vos symptômes";
    if (!form.consultationType)
      newErrors.consultationType = "Veuillez sélectionner un type de consultation";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Store temporarily (will be replaced by real state management later)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("consultationDraft", JSON.stringify(form));
    }

    router.push("/consultation/hospital");
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="bg-surface px-5 pt-12 pb-4 flex items-center gap-4 sticky top-0 z-10 shadow-soft">
        <Link href="/" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">
          Nouvelle consultation
        </h1>
      </header>

      <main className="px-5 pt-6">
        {/* Stepper */}
        <div className="mb-8">
          <Stepper currentStep={1} totalSteps={5} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="card space-y-5">
            <Input
              id="fullName"
              name="fullName"
              label="Nom complet"
              placeholder="Ex : Jean Koffi"
              value={form.fullName}
              onChange={handleChange}
              error={errors.fullName}
              icon={<User className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
            />

            <Input
              id="phone"
              name="phone"
              type="tel"
              label="Numéro de téléphone"
              placeholder="Ex : 90 00 00 00"
              value={form.phone}
              onChange={handleChange}
              error={errors.phone}
              icon={<Phone className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
            />

            <Textarea
              id="symptoms"
              name="symptoms"
              label="Symptômes"
              placeholder="Décrivez vos symptômes...\nex : fièvre, toux, fatigue, maux de tête..."
              value={form.symptoms}
              onChange={handleChange}
              error={errors.symptoms}
              icon={<ClipboardList className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
            />

            <Select
              id="consultationType"
              name="consultationType"
              label="Type de consultation"
              placeholder="Sélectionnez le type de consultation"
              options={consultationTypes}
              value={form.consultationType}
              onChange={handleChange}
              error={errors.consultationType}
              icon={<Stethoscope className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />}
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Continuer
            <ArrowRight className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </form>
      </main>
    </div>
  );
}
