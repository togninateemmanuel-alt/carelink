"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Store,
  Search,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  Home,
  Calendar,
  FileText,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const pharmacies = [
  {
    id: 1,
    name: "Pharmacie Centrale",
    zone: "Centre-ville",
    distance: 1.2,
    phone: "90 11 22 33",
    stock: { paracetamol: 50, amoxicilline: 20 },
  },
  {
    id: 2,
    name: "Pharmacie Sainte Marie",
    zone: "Agoè",
    distance: 2.5,
    phone: "91 22 33 44",
    stock: { paracetamol: 0, amoxicilline: 15 },
  },
  {
    id: 3,
    name: "Pharmacie de la Paix",
    zone: "Tokoin",
    distance: 3.8,
    phone: "92 33 44 55",
    stock: { paracetamol: 30, amoxicilline: 0 },
  },
  {
    id: 4,
    name: "Pharmacie Espoir",
    zone: "Adidogomé",
    distance: 5.1,
    phone: "93 44 55 66",
    stock: { paracetamol: 80, amoxicilline: 40 },
  },
];

export default function PharmacyPage() {
  const [search, setSearch] = useState("");

  const filtered = pharmacies
    .filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.zone.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.distance - b.distance);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-surface px-5 pt-12 pb-4 sticky top-0 z-10 shadow-soft">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/" className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
          </Link>
          <h1 className="text-lg font-semibold text-text-primary">Pharmacies</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Rechercher une pharmacie ou une zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
      </header>

      <main className="px-5 pt-5">
        <p className="text-sm text-text-secondary mb-4">
          {filtered.length} pharmacie{filtered.length > 1 ? "s" : ""} trouvée{filtered.length > 1 ? "s" : ""}
        </p>

        <div className="space-y-4">
          {filtered.map((pharmacy) => {
            const hasPara = pharmacy.stock.paracetamol > 0;
            const hasAmox = pharmacy.stock.amoxicilline > 0;
            const allAvailable = hasPara && hasAmox;

            return (
              <div key={pharmacy.id} className="card">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Store className="w-6 h-6 text-primary" strokeWidth={1.75} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-text-primary">{pharmacy.name}</h3>
                      {allAvailable && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success-light text-success whitespace-nowrap">
                          Stock OK
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />
                        {pharmacy.zone} • {pharmacy.distance} km
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        {hasPara ? (
                          <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={1.75} />
                        ) : (
                          <XCircle className="w-4 h-4 text-danger" strokeWidth={1.75} />
                        )}
                        <span className={hasPara ? "text-text-primary" : "text-text-muted"}>
                          Paracétamol {hasPara ? `(${pharmacy.stock.paracetamol})` : "— Rupture"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasAmox ? (
                          <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={1.75} />
                        ) : (
                          <XCircle className="w-4 h-4 text-danger" strokeWidth={1.75} />
                        )}
                        <span className={hasAmox ? "text-text-primary" : "text-text-muted"}>
                          Amoxicilline {hasAmox ? `(${pharmacy.stock.amoxicilline})` : "— Rupture"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <a
                        href={`tel:${pharmacy.phone.replace(/\s/g, "")}`}
                        className="text-sm text-primary font-medium flex items-center gap-1.5"
                      >
                        <Phone className="w-4 h-4" strokeWidth={1.75} />
                        {pharmacy.phone}
                      </a>

                      <button
                        className={cn(
                          "text-sm font-semibold px-4 py-2 rounded-button transition",
                          allAvailable
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-text-muted cursor-not-allowed"
                        )}
                        disabled={!allAvailable}
                      >
                        Choisir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-text-secondary">Aucune pharmacie trouvée</p>
          </div>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-2 pb-safe pt-2">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Link href="/" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
            <Home className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Accueil</span>
          </Link>
          <Link href="/appointments" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
            <Calendar className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Rendez-vous</span>
          </Link>
          <Link href="/prescriptions" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
            <FileText className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Ordonnances</span>
          </Link>
          <Link href="/pharmacy" className="flex flex-col items-center gap-1 py-2 px-3 text-primary">
            <Store className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Pharmacie</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 py-2 px-3 text-text-muted">
            <User className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[11px] font-medium">Profil</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
