# Mobile Prescription System — Audit & Implementation Map

## Prototype
- File `ordonnance mobile.html` was **not found** in the repository.
- Workflow taken from the product prompt and mapped onto existing CareLink schema.

## Reused (existing CareLink)
| Domain | Existing |
|--------|----------|
| Auth | Supabase Auth + `profiles.role` |
| Patient | `profiles`, `patient_profiles` |
| Doctor | `doctor_profiles`, consultations, appointments |
| Pharmacy | `pharmacies`, `pharmacy_staff`, products, stocks |
| Prescriptions | `prescriptions`, `prescription_items`, transfers |
| Insurance | `insurance_providers`, `patient_insurances`, claims |
| Payments | `payments` table (no fake success) |
| Notifications | `notifications` |
| Audit | `audit_logs` |
| RPCs | `complete_consultation_and_issue_prescription`, transfer RPCs |

## Missing → added in migration `20260909000016`
| Entity | Purpose |
|--------|---------|
| `hospitals` | Facility selection + consultation price |
| `hospital_staff` | Hospital-only access |
| `prescription_requests` | Patient intake + queue + triage |
| `prescription_access_secrets` | Token (no plaintext PIN in frontend) |
| `system_settings` | Avg consultation minutes |
| RPCs | `create_prescription_request`, `hospital_validate_prescription_request`, `verify_prescription_token` |

## Security notes from prototype (to avoid)
- localStorage as DB
- Hard-coded PIN `1234`
- Fake payment success
- setTimeout "transmission"
- Hard-coded hospitals/pharmacies/stock

## Apps
- **Patient**: request wizard + status + prescriptions (extend existing app)
- **Doctor / Pharmacy**: existing portals extended earlier
- **Hospital**: staff use same Supabase project via `hospital_staff` (UI can live in doctor app or dedicated routes later)

## Payment policy
Providers (Gozem, TMoney, etc.) show **Demo / unavailable** until a real provider API is configured. Never mark `successful` from the frontend alone.
