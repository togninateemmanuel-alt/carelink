export type LicenseStatus = "active" | "expired" | "suspended" | "cancelled";

export type WorkstationType = "reception" | "doctor" | "admin";

export interface HospitalLicense {
  id: string;
  hospitalId: string;
  planId: string;
  status: LicenseStatus;
  maxDevices: number | null;
  startsAt: string;
  expiresAt: string | null;
}

export interface HospitalDevice {
  id: string;
  hospitalId: string;
  deviceId: string;
  name: string;
  workstationType: WorkstationType;
  active: boolean;
}
