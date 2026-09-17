export type HospitalDeviceStatus = "pending" | "active" | "blocked" | "revoked";
export type HospitalWorkstationType = "admin" | "reception" | "doctor";

export const DEVICE_STORAGE_KEY = "carelink_hospital_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY);
  if (existing) return existing;

  const id = `CL-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
  window.localStorage.setItem(DEVICE_STORAGE_KEY, id);
  return id;
}
