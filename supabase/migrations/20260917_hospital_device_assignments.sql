-- CareLink Hôpital: explicit workstation assignment constraints.
-- A reception workstation belongs to a reception desk; a doctor workstation belongs to a doctor.

alter table public.hospital_devices
  add constraint hospital_devices_reception_assignment_check
  check (
    workstation_type <> 'reception'
    or reception_desk_id is not null
  );

alter table public.hospital_devices
  add constraint hospital_devices_doctor_assignment_check
  check (
    workstation_type <> 'doctor'
    or doctor_id is not null
  );

create index if not exists hospital_devices_reception_desk_idx
  on public.hospital_devices (reception_desk_id)
  where reception_desk_id is not null;

create index if not exists hospital_devices_doctor_idx
  on public.hospital_devices (doctor_id)
  where doctor_id is not null;
