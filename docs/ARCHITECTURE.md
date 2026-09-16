# Architecture CareLink

## Objectif
CareLink est organisé autour de trois espaces fonctionnels reliés au même backend Supabase :

```text
CARELINK OFFICIEL
├── Espace Patient
├── Espace Hôpital
│   ├── Administration / Licence
│   ├── Accueil 1..N
│   └── Médecin 1..N
└── Espace Pharmacie

                 ↓
              SUPABASE
                 ↓
      Auth + PostgreSQL + Storage
```

## Organisation d'un hôpital
Un hôpital est une organisation unique. Les utilisateurs ont des comptes individuels et les ordinateurs ont des identifiants d'appareil distincts.

```text
Hôpital
├── Abonnement
├── Licence(s)
├── Appareils autorisés
├── Personnel
│   ├── Administrateur hôpital
│   ├── Agents d'accueil
│   └── Médecins
├── Postes d'accueil
│   ├── Accueil 1
│   ├── Accueil 2
│   └── Accueil N
├── Spécialités
├── Files d'attente
└── Configuration du dossier patient
```

La clé de licence autorise l'organisation ; elle ne remplace pas l'authentification du personnel.

## Flux patient → accueil → médecin
```text
Patient
→ Choisit un hôpital
→ Décrit ses symptômes
→ Complète le dossier demandé
→ Envoie la demande
→ Routage automatique vers l'accueil configuré
→ Vérification par l'accueil
→ Correction demandée si nécessaire
→ Validation
→ Spécialité / file d'attente
→ Date + heure + médecin
→ Dossier du jour du médecin
→ Consultation
→ Compte-rendu + ordonnance
→ Envoi direct au patient
→ Pharmacie si nécessaire
```

## Responsabilités
### Administration hôpital
- abonnement et licence ;
- appareils ;
- postes d'accueil ;
- personnel ;
- symptômes, spécialités et champs obligatoires.

### Accueil
- réception et validation des dossiers ;
- demande de correction ;
- affectation de spécialité ;
- planification date/heure/médecin ;
- transmission des dossiers du jour.

### Médecin
- dossiers affectés ;
- consultation ;
- compte-rendu ;
- ordonnance signée ;
- publication directe vers le patient.

## Structure cible du dépôt
```text
app/
├── consultation/         # parcours patient
├── appointments/         # rendez-vous patient
├── prescriptions/        # ordonnances patient
├── pharmacy/             # parcours pharmacie
└── hospital/
    ├── activate/         # activation d'un ordinateur par licence
    ├── admin/            # administration de l'organisation
    ├── reception/        # postes et opérations d'accueil
    ├── doctor/           # espace médecin
    ├── appointments/     # compatibilité avec l'ancien parcours
    ├── calendar/         # calendrier
    └── subscription/     # abonnement

lib/
├── supabase/             # clients Supabase
└── carelink/
    ├── hospital/         # règles métier hôpital
    ├── reception/        # routage et validation
    ├── doctor/           # consultation et prescription
    └── licensing/        # licences et appareils

supabase/
├── schema.sql            # schéma actuel
└── migrations/           # évolutions versionnées
```

## Migration
La nouvelle architecture est introduite progressivement afin de conserver les routes patient et pharmacie existantes. Les nouvelles tables seront ajoutées avec RLS et des politiques basées sur le rôle et l'appartenance à l'hôpital.
