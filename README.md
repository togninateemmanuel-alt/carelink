# CareLink

Plateforme de santé digitale – 3 applications interconnectées

## Architecture

```
Patient App  ←→  Backend Supabase  ←→  Hospital App
                      ↕
                 Pharmacy App
```

### Applications

1. **Patient** – Prise de rendez-vous, ordonnances, recherche de pharmacies
2. **Hôpital / Médecin** – Réception des dossiers, consultation, prescription
3. **Pharmacie** – Marketplace, stock, commandes

## Stack

- **Frontend** : Next.js 15 + TypeScript + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + Storage)
- **Design System** : Medical Clean

## Setup

### 1. Créer un projet Supabase

1. Va sur [supabase.com](https://supabase.com) et crée un compte
2. Crée un nouveau projet
3. Dans **SQL Editor**, colle et exécute le contenu de `supabase/schema.sql`
4. Dans **Settings → API**, copie :
   - `Project URL`
   - `anon public` key

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Remplis les valeurs avec celles de ton projet Supabase.

### 3. Lancer l'application

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

## Structure actuelle

- `/` – Dashboard Patient
- `/consultation/*` – Parcours de prise de rendez-vous
- `/appointments` – Mes rendez-vous
- `/prescriptions` – Mes ordonnances (protégées par code)
- `/pharmacy` – Recherche de pharmacies
- `/profile` – Profil + code d'ordonnance

## Prochaines étapes

- [ ] Authentification Supabase (Patient)
- [ ] Connecter le parcours consultation à la base de données
- [ ] Application Hôpital / Médecin
- [ ] Application Pharmacie (Marketplace)
