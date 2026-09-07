/**
 * Centralized Authentication & Profile Service
 * Implements strict role handling and secure session management
 * Project: CareLink Healthcare Platform
 */

import type { CareLinkSupabaseClient } from '../client';
import type {
  AppRole,
  Database,
  PatientSignupPayload,
  DoctorSignupPayload,
  UserProfile,
} from '@carelink/shared';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type PatientRow = Database['public']['Tables']['patient_profiles']['Row'];
type DoctorRow = Database['public']['Tables']['doctor_profiles']['Row'];

export class AuthService {
  constructor(private client: CareLinkSupabaseClient) {}

  /**
   * Registers a new patient account
   */
  async signUpPatient(payload: PatientSignupPayload) {
    const { data, error } = await this.client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          role: 'patient' as AppRole,
          first_name: payload.firstName,
          last_name: payload.lastName,
          phone: payload.phone,
        },
      },
    });

    if (error) throw error;
    return data;
  }

  /**
   * Registers a new professional doctor account with license and specialty
   */
  async signUpDoctor(payload: DoctorSignupPayload) {
    // 1. Auth Signup with doctor role
    const { data: authData, error: authError } = await this.client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          role: 'doctor' as AppRole,
          first_name: payload.firstName,
          last_name: payload.lastName,
          phone: payload.phone,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Échec de la création du compte praticien.');

    // 2. Insert into doctor_profiles
    const { error: doctorError } = await this.client
      .from('doctor_profiles')
      .insert({
        profile_id: authData.user.id,
        license_number: payload.licenseNumber,
        specialty: payload.specialty,
        consultation_fee: payload.consultationFee,
        currency: 'XOF',
        verification_status: 'pending',
      });

    if (doctorError) throw doctorError;

    return authData;
  }

  /**
   * Registers a new pharmacy admin account and pharmacy office
   */
  async signUpPharmacyAdmin(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    pharmacyName: string;
    licenseNumber: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
  }) {
    // 1. Auth Signup
    const { data: authData, error: authError } = await this.client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          role: 'pharmacy_admin' as AppRole,
          first_name: payload.firstName,
          last_name: payload.lastName,
          phone: payload.phone,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Échec de la création du compte pharmacie.');

    // 2. Insert into pharmacies
    const { data: pharmacyData, error: pharmacyError } = await this.client
      .from('pharmacies')
      .insert({
        name: payload.pharmacyName,
        license_number: payload.licenseNumber,
        address: payload.address,
        city: payload.city,
        latitude: payload.latitude,
        longitude: payload.longitude,
        phone: payload.phone,
        email: payload.email,
        is_verified: false,
        is_active: true,
      })
      .select()
      .single();

    if (pharmacyError) throw pharmacyError;

    // 3. Link user as admin in pharmacy_staff
    const { error: staffError } = await this.client.from('pharmacy_staff').insert({
      pharmacy_id: pharmacyData.id,
      profile_id: authData.user.id,
      staff_role: 'admin',
      is_active: true,
    });

    if (staffError) throw staffError;

    return { auth: authData, pharmacy: pharmacyData };
  }

  /**
   * Signs in user with email & password
   */
  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  /**
   * Signs out current user
   */
  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  /**
   * Gets current session user
   */
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser();
    if (error) return null;
    return user;
  }

  /**
   * Fetches full profile with role-specific profile details
   */
  async getCurrentProfile(): Promise<{
    profile: ProfileRow;
    patientProfile?: PatientRow | null;
    doctorProfile?: DoctorRow | null;
  } | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data: profile, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) return null;

    let patientProfile: PatientRow | null = null;
    let doctorProfile: DoctorRow | null = null;

    if (profile.role === 'patient') {
      const { data } = await this.client
        .from('patient_profiles')
        .select('*')
        .eq('profile_id', user.id)
        .single();
      patientProfile = data;
    } else if (profile.role === 'doctor') {
      const { data } = await this.client
        .from('doctor_profiles')
        .select('*')
        .eq('profile_id', user.id)
        .single();
      doctorProfile = data;
    }

    return { profile, patientProfile, doctorProfile };
  }

  /**
   * Subscribes to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }
}
