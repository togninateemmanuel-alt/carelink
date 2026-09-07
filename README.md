# CARELINK — Plateforme Intégrée de Santé

CareLink est un écosystème e-santé unifié connectant trois applications métiers spécialisées autour d'une base de données et d'un backend centralisés sous PostgreSQL / Supabase :

1. **CareLink Patient** : Prise de rendez-vous, téléconsultations, dossier médical personnel, ordonnances électroniques, recherche officinale géolocalisée et marketplace pharmaceutique.
2. **CareLink Médecin** : Agenda dynamique de consultation, dossier médical partagé avec consentement, anamnèse & diagnostics, émission d'ordonnances sécurisées et signées, transfert confraternel de dossiers.
3. **CareLink Pharmacie** : Gestion officinale des stocks avec contrôle transactionnel anti-rupture, traitement des ordonnances électroniques transférées, gestion des commandes multi-pharmacies et intégration tiers-payant.

---

## 🏛️ Architecture du Projet

Le projet est structuré sous forme de monorepo modulaire :

```
carelink/
├── apps/
│   ├── patient/            # Application Web & Mobile PWA Patient
│   ├── doctor/             # Portail Métier Médecin
│   └── pharmacy/           # Portail Officinal Pharmacie
├── packages/
│   ├── shared/             # Types TypeScript, validateurs (Zod), constantes
│   ├── ui/                 # Design System et composants partagés
│   └── supabase-client/    # Client Supabase typé et helpers d'authentification
├── supabase/
│   ├── migrations/         # Schémas SQL, triggers, fonctions PL/pgSQL, RLS
│   ├── functions/          # Edge Functions (webhooks, notifications push)
│   └── seed.sql            # Données de référence (spécialités, catégories, etc.)
└── docs/
    ├── architecture/       # Documentation d'architecture & flux métier
    ├── database/           # Dictionnaire de données & diagrammes
    └── security/           # Matrice RLS & conformité de données de santé
```

---

## 🔐 Principes Fondateurs de Sécurité

1. **Isolation stricte via RLS (Row-Level Security)** : 100% des tables PostgreSQL sont sécurisées par des politiques RLS.
2. **Confidentialité médicale** : Aucun médecin ne peut accéder au dossier d'un patient sans autorisation explicite enregistrée dans `doctor_patient_access`.
3. **Contrôle strict des stocks** : Les diminutions de stocks sont opérées par des procédures stockées transactionnelles (`reserve_and_decrement_stock`) avec verrous `SELECT ... FOR UPDATE` pour bannir tout stock négatif.
4. **Cloisonnement officinal** : Chaque pharmacie n'a accès qu'à son catalogue, son stock, ses commandes et aux ordonnances qui lui ont été explicitement transférées par le patient.
5. **Protection des identités et des rôles** : Aucun utilisateur ne peut s'auto-attribuer un rôle supérieur (ex: médecin ou administrateur) côté frontend.

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js (>= 18.x) ou pnpm / npm
- Supabase CLI (ou instance Supabase Cloud)

### Application des Migrations SQL
Les migrations SQL se trouvent dans `supabase/migrations/` et sont exécutables séquentiellement dans l'éditeur SQL de votre projet Supabase ou via la CLI Supabase :
```bash
supabase db push
# ou via psql
psql -h [DB_HOST] -U postgres -d postgres -f supabase/migrations/20260907000001_extensions_and_enums.sql
```
