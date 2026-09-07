# Dictionnaire de Données — Schéma CareLink (PostgreSQL / Supabase)

Ce document récapitule les 28 tables du schéma de données centralisé de CareLink.

---

## 1. Identités & Rôles
| Table | Description | Clé Primaire | Clés Étrangères / Relations |
| :--- | :--- | :--- | :--- |
| **`profiles`** | Profil de base utilisateur | `id` (UUID) | `id` -> `auth.users(id)` |
| **`patient_profiles`** | Données personnelles & d'urgence du patient | `id` (UUID) | `profile_id` -> `profiles(id)` |
| **`doctor_profiles`** | Profil professionnel, spécialité, licence et tarifs | `id` (UUID) | `profile_id` -> `profiles(id)` |
| **`pharmacies`** | Données d'officine (coordonnées GPS, quartier, horaires) | `id` (UUID) | - |
| **`pharmacy_staff`** | Affiliation des pharmaciens et préparateurs aux officines | `id` (UUID) | `pharmacy_id`, `profile_id` |

---

## 2. Dossiers Médicaux & Accès
| Table | Description | Clé Primaire | Clés Étrangères / Relations |
| :--- | :--- | :--- | :--- |
| **`medical_dossiers`** | Dossier de santé unique du patient (allergies, antécédents) | `id` (UUID) | `patient_id` -> `profiles(id)` |
| **`medical_record_entries`** | Entrées d'anamnèse, diagnostics, observations, examens | `id` (UUID) | `dossier_id`, `doctor_id` |
| **`doctor_patient_access`** | Habilitation formelle d'un praticien sur un dossier | `id` (UUID) | `doctor_id`, `patient_id`, `granted_by` |
| **`dossier_transfers`** | Traçabilité des transferts confraternels de dossiers | `id` (UUID) | `dossier_id`, `from_doctor_id`, `to_doctor_id` |

---

## 3. Disponibilités, Agenda & Consultations
| Table | Description | Clé Primaire | Clés Étrangères / Relations |
| :--- | :--- | :--- | :--- |
| **`doctor_slots`** | Créneaux horaires réels configurés par le praticien | `id` (UUID) | `doctor_id` -> `profiles(id)` |
| **`appointments`** | Rendez-vous réservés entre un patient et un médecin | `id` (UUID) | `patient_id`, `doctor_id`, `slot_id` |
| **`consultations`** | Actes de consultation avec signes vitaux, examens, notes | `id` (UUID) | `appointment_id`, `doctor_id`, `patient_id` |

---

## 4. Ordonnances Électroniques & Transferts
| Table | Description | Clé Primaire | Clés Étrangères / Relations |
| :--- | :--- | :--- | :--- |
| **`prescriptions`** | Entête d'ordonnance avec numéro unique et signature | `id` (UUID) | `consultation_id`, `doctor_id`, `patient_id` |
| **`prescription_items`** | Lignes de prescription (molécules, dosage, durée) | `id` (UUID) | `prescription_id` |
| **`prescription_pharmacy_transfers`** | Transfert volontaire d'une ordonnance vers une officine | `id` (UUID) | `prescription_id`, `patient_id`, `pharmacy_id` |

---

## 5. Catalogue Officinal, Stocks & Mouvements
| Table | Description | Clé Primaire | Clés Étrangères / Relations |
| :--- | :--- | :--- | :--- |
| **`product_categories`** | Taxonomie pharmaceutique et parapharmaceutique | `id` (UUID) | `parent_id` (auto-référence) |
| **`products`** | Fiches articles vendues par chaque pharmacie | `id` (UUID) | `pharmacy_id`, `category_id` |
| **`product_stocks`** | Stock physique courant et stock sous réservation | `product_id` | `product_id`, `pharmacy_id` |
| **`stock_movements`** | Grand livre d'audit immuable de chaque variation de stock | `id` (UUID) | `product_id`, `pharmacy_id`, `performed_by` |

---

## 6. Commandes Marketplace & Fulfillments
| Table | Description | Clé Primaire | Clés Étrangères / Relations |
| :--- | :--- | :--- | :--- |
| **`carts`** | Panier d'achat du patient | `id` (UUID) | `patient_id` -> `profiles(id)` |
| **`cart_items`** | Articles dans le panier | `id` (UUID) | `cart_id`, `product_id`, `pharmacy_id` |
| **`orders`** | Commande mère globale | `id` (UUID) | `patient_id` -> `profiles(id)` |
| **`order_fulfillments`** | Sous-commandes découpées par officine | `id` (UUID) | `order_id`, `pharmacy_id` |
| **`order_items`** | Détail des articles d'un fulfillment | `id` (UUID) | `order_fulfillment_id`, `product_id` |

---

## 7. Assurances, Tiers-Payant & Règlements
| Table | Description | Clé Primaire | Clés Étrangères / Relations |
| :--- | :--- | :--- | :--- |
| **`insurance_providers`** | Organismes d'assurance partenaires (SUNU, NSIA, etc.) | `id` (UUID) | - |
| **`patient_insurances`** | Police d'assurance et numéro d'adhérent du patient | `id` (UUID) | `patient_id`, `provider_id` |
| **`insurance_coverages`** | Barèmes de prise en charge par catégorie de soins | `id` (UUID) | `provider_id`, `category_id` |
| **`insurance_claims`** | Feuilles de réclamation de tiers-payant | `id` (UUID) | `patient_insurance_id`, `order_id`, `consultation_id` |
| **`payments`** | Journal des paiements (T-Money, Moov, Carte, Espèces) | `id` (UUID) | `order_id`, `consultation_id`, `patient_id` |

---

## 8. Notifications & Audit Légal
| Table | Description | Clé Primaire | Clés Étrangères / Relations |
| :--- | :--- | :--- | :--- |
| **`notifications`** | Notifications push et in-app aux destinataires | `id` (UUID) | `recipient_id` -> `profiles(id)` |
| **`audit_logs`** | Traçabilité légale HIPAA/RGPD (qui, quoi, quand) | `id` (UUID) | `actor_id` -> `profiles(id)` |
