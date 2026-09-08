# Matrice de Sécurité & Droits d'Accès (RLS) — CareLink

Toutes les tables bénéficient de `ROW LEVEL SECURITY` (RLS). Ce document décrit la matrice des droits d'accès par rôle utilisateur.

---

## Matrice des Permissions par Entité

| Domaine / Table | Patient | Médecin | Pharmacie | Platform Admin |
| :--- | :---: | :---: | :---: | :---: |
| **`profiles`** | Lecture (Tous) / Modif (Soi) | Lecture (Tous) / Modif (Soi) | Lecture (Tous) / Modif (Soi) | Accès Total |
| **`patient_profiles`** | Lecture & Modif (Soi) | Lecture (Si accès actif) | ❌ Aucun accès | Accès Total |
| **`doctor_profiles`** | Lecture (Tous) | Lecture & Modif (Soi) | Lecture (Tous) | Accès Total |
| **`pharmacies`** | Lecture (Si active) | Lecture (Si active) | Modif (Son officine) | Accès Total |
| **`pharmacy_staff`** | ❌ Aucun accès | ❌ Aucun accès | Lecture & Modif (Son officine) | Accès Total |
| **`medical_dossiers`** | Lecture (Soi) | Lecture & Modif (Si accès actif) | ❌ Aucun accès | Accès Total |
| **`medical_record_entries`** | Lecture (Soi) | Lecture & Création (Si accès actif) | ❌ Aucun accès | Accès Total |
| **`doctor_patient_access`** | Gestion (Soi) | Lecture (Accès reçus) | ❌ Aucun accès | Accès Total |
| **`dossier_transfers`** | Lecture (Ses transferts) | Création & Acceptation (Médecins A/B) | ❌ Aucun accès | Accès Total |
| **`doctor_slots`** | Lecture (Disponibilités) | Gestion (Ses créneaux si vérifié) | ❌ Aucun accès | Accès Total |
| **`appointments`** | Prise RDV & Suivi (Soi) | Consultation & Gestion (Ses RDV) | ❌ Aucun accès | Accès Total |
| **`consultations`** | Lecture (Ses consultations) | Création & Rédaction (Ses actes) | ❌ Aucun accès | Accès Total |
| **`prescriptions`** | Lecture & Suivi (Ses ordonnances) | Création & Signature (Si vérifié + accès actif) | Lecture (Si transférée à son officine) | Accès Total |
| **`prescription_items`** | Lecture (Ses ordonnances) | Gestion (Ses ordonnances) | Lecture (Si transférée à son officine) | Accès Total |
| **`prescription_pharmacy_transfers`**| Déclenchement du transfert (Soi)| ❌ Aucun accès | Réception & Traitement (Son officine) | Accès Total |
| **`product_categories`** | Lecture publique | Lecture publique | Lecture publique | Accès Total |
| **`products`** | Lecture (Marketplace public) | Lecture (Marketplace public) | Gestion intégrale (Son catalogue) | Accès Total |
| **`product_stocks`** | Lecture (Disponibilité) | Lecture (Disponibilité) | Gestion (Son stock) | Accès Total |
| **`stock_movements`** | ❌ Aucun accès | ❌ Aucun accès | Lecture (Son officine uniquement) | Accès Total |
| **`carts` & `cart_items`** | Gestion intégrale (Soi) | ❌ Aucun accès | ❌ Aucun accès | Accès Total |
| **`orders`** | Consultation & Création (Soi) | ❌ Aucun accès | ❌ Aucun accès | Accès Total |
| **`order_fulfillments`** | Suivi (Ses commandes) | ❌ Aucun accès | Préparation & Clôture (Son officine) | Accès Total |
| **`order_items`** | Lecture (Ses commandes) | ❌ Aucun accès | Lecture (Ses fulfillments) | Accès Total |
| **`patient_insurances`** | Gestion intégrale (Soi) | ❌ Aucun accès | Lecture (Pour facturation) | Accès Total |
| **`insurance_claims`** | Lecture (Ses feuilles de soins) | Lecture (Si liée consultation) | Lecture (Si liée fulfillment) | Accès Total |
| **`payments`** | Lecture (Ses paiements) | ❌ Aucun accès | Lecture (Ses règlements perçus) | Accès Total |
| **`notifications`** | Gestion (Ses notifications) | Gestion (Ses notifications) | Gestion (Ses notifications) | Accès Total |
| **`audit_logs`** | ❌ Aucun accès | ❌ Aucun accès | ❌ Aucun accès | Lecture seule |

---

## Règles d'Or de Sécurité

1. **Pas d'accès libre entre médecins** : Un médecin ne dispose d'aucun accès universel aux dossiers des patients.
2. **Cloisonnement officinal étanche** : Une pharmacie ne peut en aucun cas inspecter les stocks, marges, volumes de vente ou mouvements d'une autre pharmacie.
3. **Impossibilité de transfert passif d'ordonnance** : Une ordonnance n'est jamais diffusée publiquement sur le réseau de pharmacies. Seul le patient choisit explicitement et individuellement l'officine destinataire.
4. **Agrément obligatoire des praticiens** : Aucun médecin non vérifié (`verification_status != 'verified'`) ne peut publier de créneaux ou émettre d'ordonnances opposables.
5. **Vérification d'officine** : Seules les pharmacies officiellement vérifiées (`is_verified = true`) apparaissent dans les résultats publics du marketplace multi-officines.

