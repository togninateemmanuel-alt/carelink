# CareLink

Plateforme de santé digitale reliant patients, hôpitaux, médecins et pharmacies autour d'un backend Supabase.

## Architecture cible

```text
CareLink officiel
├── Patient
├── Hôpital
│   ├── Administration
│   ├── Licence / abonnement
│   ├── Appareils
│   ├── Accueil 1..N
│   └── Médecins 1..N
└── Pharmacie

                 ↓
              Supabase
        Auth + PostgreSQL + Storage
```

Un hôpital est une organisation. Le personnel possède des comptes individuels et chaque ordinateur possède son propre identifiant d'appareil. La licence autorise l'organisation mais ne remplace pas l'authentification.

## Flux hospitalier

```text
Patient
→ choix de l'hôpital
→ symptômes + dossier
→ routage vers l'accueil configuré
→ contrôle / correction / validation
→ spécialité + file + médecin
→ date + heure
→ dossier du jour du médecin
→ consultation
→ compte-rendu + ordonnance
→ patient
→ pharmacie si nécessaire
```

## Structure du dépôt

- `app/consultation` : parcours patient
- `app/appointments` : rendez-vous patient
- `app/prescriptions` : ordonnances patient
- `app/pharmacy` : pharmacie
- `app/hospital/admin` : administration de l'organisation
- `app/hospital/activate` : activation d'un ordinateur
- `app/hospital/reception` : opérations d'accueil
- `app/hospital/doctor` : espace médecin
- `app/hospital/subscription` : abonnement existant, en cours d'évolution
- `app/hospital/calendar` : calendrier existant
- `lib/carelink/hospital` : domaine organisation hôpital
- `lib/carelink/licensing` : domaine licence/appareils
- `lib/carelink/reception` : routage et validation accueil
- `lib/carelink/doctor` : domaine consultation médecin
- `lib/supabase` : clients et types Supabase
- `supabase` : schéma et migrations SQL
- `docs/ARCHITECTURE.md` : architecture détaillée

## Stack

- Next.js 15 + TypeScript
- Supabase PostgreSQL + Auth + Storage
- Tailwind CSS

## Migration progressive

Les routes patient et pharmacie existantes sont conservées. L'espace hôpital est restructuré progressivement avant d'ajouter les nouvelles tables Supabase et leurs politiques RLS.

Les prochaines évolutions sont :

1. modèle Supabase pour organisation, licences et appareils ;
2. personnel, postes d'accueil, symptômes et spécialités ;
3. routage automatique des dossiers ;
4. files et programmation ;
5. espace médecin et compte-rendu ;
6. transmission directe patient + pharmacie ;
7. durcissement RLS et vérification complète.
