export interface DoctorDayItem {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: "validated" | "in_progress" | "completed";
}

export interface ConsultationRecordInput {
  appointmentId: string;
  doctorId: string;
  diagnosis: string;
  clinicalNotes: string;
  treatmentPlan: string;
}
