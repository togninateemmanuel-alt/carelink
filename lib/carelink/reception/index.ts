export interface ReceptionDesk {
  id: string;
  hospitalId: string;
  name: string;
  active: boolean;
}

export interface ReceptionRoutingRule {
  receptionDeskId: string;
  symptomCode: string;
  priority: number;
}

export interface IntakeField {
  id: string;
  hospitalId: string;
  fieldKey: string;
  label: string;
  required: boolean;
  active: boolean;
}

export function normalizeSymptoms(symptoms: string): string[] {
  return symptoms
    .split(/[,;\n]/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}
