export type HospitalStaffRole = "hospital_admin" | "reception" | "doctor";

export interface HospitalStaffMember {
  id: string;
  hospitalId: string;
  profileId: string;
  role: HospitalStaffRole;
  active: boolean;
}

export interface HospitalOrganization {
  id: string;
  name: string;
  active: boolean;
}
