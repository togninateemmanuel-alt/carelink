-- CareLink role workflow integration.
-- Applied to the connected Supabase project as migration:
-- add_carelink_patient_transaction_rpcs
-- complete_carelink_role_workflows

create or replace function public.search_marketplace(
  p_query text default null, p_lat numeric default null, p_lon numeric default null,
  p_radius_km numeric default null, p_limit integer default 40
) returns table(product_id uuid, product_name text, brand text, generic_name text, form text,
  dosage text, price numeric, currency text, pharmacy_id uuid, pharmacy_name text,
  pharmacy_city text, current_stock integer, distance_km numeric)
language sql security definer set search_path=public as $$
  select p.id,p.name,p.brand,p.generic_name,p.form,p.dosage,p.price,p.currency,p.pharmacy_id,
    ph.name,ph.city,greatest(coalesce(ps.current_quantity,p.stock_quantity),0),
    case when p_lat is not null and p_lon is not null and ph.latitude is not null and ph.longitude is not null
      then round((6371*2*asin(sqrt(power(sin(radians(ph.latitude-p_lat)/2),2)+cos(radians(p_lat))*cos(radians(ph.latitude))*power(sin(radians(ph.longitude-p_lon)/2),2)))))::numeric,2)
      else null end
  from public.products p join public.pharmacies ph on ph.id=p.pharmacy_id and ph.is_active=true
  left join public.product_stocks ps on ps.product_id=p.id and ps.pharmacy_id=p.pharmacy_id
  where p.is_active=true and (nullif(trim(p_query),'') is null or p.name ilike '%'||trim(p_query)||'%' or coalesce(p.brand,'') ilike '%'||trim(p_query)||'%' or coalesce(p.generic_name,'') ilike '%'||trim(p_query)||'%' or coalesce(p.form,'') ilike '%'||trim(p_query)||'%')
  order by p.name limit greatest(coalesce(p_limit,40),1);
$$;
grant execute on function public.search_marketplace(text,numeric,numeric,numeric,integer) to authenticated;

create or replace function public.book_appointment_slot(p_patient_id uuid,p_slot_id uuid,p_reason text,p_mode text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.doctor_slots%rowtype; a public.appointments%rowtype; duration integer;
begin
  if auth.uid() is null or auth.uid()<>p_patient_id then raise exception 'UNAUTHORIZED'; end if;
  select * into s from public.doctor_slots where id=p_slot_id for update;
  if not found then raise exception 'SLOT_NOT_FOUND'; end if;
  if s.status<>'available' or s.start_time<now() then raise exception 'SLOT_NOT_AVAILABLE'; end if;
  if p_mode is not null and p_mode<>s.consultation_mode then raise exception 'CONSULTATION_MODE_MISMATCH'; end if;
  duration:=greatest(1,extract(epoch from(s.end_time-s.start_time))::integer/60);
  insert into public.appointments(patient_id,doctor_id,scheduled_at,duration_minutes,status,reason,consultation_mode,reason_for_visit,slot_id)
  values(p_patient_id,s.doctor_id,s.start_time,duration,'confirmed',nullif(trim(p_reason),''),coalesce(p_mode,s.consultation_mode),nullif(trim(p_reason),''),s.id) returning * into a;
  update public.doctor_slots set status='booked',updated_at=now() where id=s.id;
  return jsonb_build_object('id',a.id,'appointment_id',a.id,'slot_id',s.id,'scheduled_at',a.scheduled_at,'status',a.status);
end; $$;
grant execute on function public.book_appointment_slot(uuid,uuid,text,text) to authenticated;

create or replace function public.checkout_cart_atomic(p_patient_id uuid,p_delivery_mode text default 'pickup',p_delivery_address text default null,p_delivery_city text default null,p_delivery_latitude numeric default null,p_delivery_longitude numeric default null,p_patient_insurance_id uuid default null,p_patient_notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare cart_id uuid; ins public.patient_insurances%rowtype; provider public.insurance_providers%rowtype; ord public.orders%rowtype; fulf public.order_fulfillments%rowtype; item record; pharm uuid; subtotal numeric; coverage numeric; patient_amount numeric; result jsonb:='[]'; first_number text; count_orders integer:=0;
begin
  if auth.uid() is null or auth.uid()<>p_patient_id then raise exception 'UNAUTHORIZED'; end if;
  if p_delivery_mode not in('pickup','standard_delivery','express_delivery') then raise exception 'INVALID_DELIVERY_MODE'; end if;
  select id into cart_id from public.carts where patient_id=p_patient_id limit 1 for update;
  if cart_id is null then raise exception 'CART_NOT_FOUND'; end if;
  if not exists(select 1 from public.cart_items where cart_id=cart_id) then raise exception 'CART_EMPTY'; end if;
  if p_patient_insurance_id is not null then
    select * into ins from public.patient_insurances where id=p_patient_insurance_id and patient_id=p_patient_id and is_verified=true and valid_from<=current_date and valid_until>=current_date;
    if not found then raise exception 'INVALID_INSURANCE'; end if;
    select * into provider from public.insurance_providers where id=ins.provider_id and is_active=true;
    if not found then raise exception 'INSURANCE_PROVIDER_INACTIVE'; end if;
  end if;
  for pharm in select distinct pharmacy_id from public.cart_items where cart_id=cart_id loop
    subtotal:=0;
    for item in select ci.*,p.name product_name,coalesce(ps.current_quantity,p.stock_quantity) available_stock from public.cart_items ci join public.products p on p.id=ci.product_id and p.is_active=true left join public.product_stocks ps on ps.product_id=ci.product_id and ps.pharmacy_id=ci.pharmacy_id where ci.cart_id=cart_id and ci.pharmacy_id=pharm loop
      if item.available_stock<item.quantity then raise exception 'INSUFFICIENT_STOCK:%',item.product_name; end if;
      subtotal:=subtotal+item.unit_price*item.quantity;
    end loop;
    coverage:=case when p_patient_insurance_id is null then 0 else round(subtotal*least(greatest(ins.coverage_rate_default,0),100)/100,2) end;
    patient_amount:=greatest(subtotal-coverage,0);
    insert into public.orders(patient_id,pharmacy_id,status,payment_status,insurance_used,insurance_provider,insurance_card_number,insurance_coverage,patient_amount,total_amount,currency,delivery_mode,delivery_address,delivery_city,delivery_latitude,delivery_longitude,patient_notes,insurance_amount)
    values(p_patient_id,pharm,'pending','pending',p_patient_insurance_id is not null,case when p_patient_insurance_id is not null then provider.name end,case when p_patient_insurance_id is not null then ins.policy_number end,coverage,patient_amount,subtotal,'XOF',p_delivery_mode,p_delivery_address,p_delivery_city,p_delivery_latitude,p_delivery_longitude,p_patient_notes,coverage) returning * into ord;
    update public.orders set order_number='CL-'||to_char(ord.created_at,'YYYYMMDD')||'-'||upper(substr(replace(ord.id::text,'-',''),1,8)) where id=ord.id returning * into ord;
    insert into public.order_fulfillments(order_id,pharmacy_id,fulfillment_number,subtotal_amount,status) values(ord.id,pharm,'FUL-'||upper(substr(replace(ord.id::text,'-',''),1,10)),subtotal,'pending') returning * into fulf;
    for item in select ci.*,p.name product_name from public.cart_items ci join public.products p on p.id=ci.product_id where ci.cart_id=cart_id and ci.pharmacy_id=pharm loop
      insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,line_total,order_fulfillment_id,total_price) values(ord.id,item.product_id,item.product_name,item.quantity,item.unit_price,item.unit_price*item.quantity,fulf.id,item.unit_price*item.quantity);
      update public.product_stocks set current_quantity=current_quantity-item.quantity,updated_at=now() where product_id=item.product_id and pharmacy_id=pharm;
      update public.products set stock_quantity=greatest(stock_quantity-item.quantity,0),updated_at=now() where id=item.product_id;
    end loop;
    if p_patient_insurance_id is not null then insert into public.insurance_claims(claim_reference,patient_insurance_id,order_id,claimed_amount,approved_amount,patient_copay_amount,status) values('CLM-'||upper(substr(replace(ord.id::text,'-',''),1,12)),p_patient_insurance_id,ord.id,coverage,coverage,patient_amount,'submitted'); end if;
    count_orders:=count_orders+1; if first_number is null then first_number:=ord.order_number; end if;
    result:=result||jsonb_build_array(jsonb_build_object('order_id',ord.id,'order_number',ord.order_number,'pharmacy_id',pharm,'subtotal',subtotal,'insurance_amount',coverage,'patient_amount',patient_amount));
  end loop;
  delete from public.cart_items where cart_id=cart_id; update public.carts set updated_at=now() where id=cart_id;
  return jsonb_build_object('order_number',first_number,'order_count',count_orders,'orders',result);
end; $$;
grant execute on function public.checkout_cart_atomic(uuid,text,text,text,numeric,numeric,uuid,text) to authenticated;

create or replace function public.start_consultation(p_appointment_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare a public.appointments%rowtype; cid uuid;
begin
 select * into a from public.appointments where id=p_appointment_id and doctor_id=auth.uid() for update; if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
 select id into cid from public.consultations where appointment_id=p_appointment_id and doctor_id=auth.uid() limit 1;
 if cid is null then insert into public.consultations(appointment_id,doctor_id,patient_id,status) values(a.id,auth.uid(),a.patient_id,'in_progress') returning id into cid; end if;
 update public.appointments set status='in_progress',updated_at=now() where id=a.id; return cid;
end; $$;
grant execute on function public.start_consultation(uuid) to authenticated;

create or replace function public.complete_consultation_and_issue_prescription(p_consultation_id uuid,p_diagnosis text,p_clinical_notes text,p_treatment_plan text,p_prescription_items jsonb,p_prescription_instructions text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.consultations%rowtype; rx public.prescriptions%rowtype; i jsonb;
begin
 select * into c from public.consultations where id=p_consultation_id and doctor_id=auth.uid() for update; if not found then raise exception 'CONSULTATION_NOT_FOUND'; end if;
 update public.consultations set status='completed',diagnosis=p_diagnosis,clinical_notes=p_clinical_notes,treatment_plan=p_treatment_plan,completed_at=now(),updated_at=now() where id=c.id;
 update public.appointments set status='completed',updated_at=now() where id=c.appointment_id;
 insert into public.prescriptions(patient_id,doctor_id,appointment_id,consultation_id,diagnosis,general_instructions,instructions,status,issued_at,valid_until,is_digitally_signed) values(c.patient_id,auth.uid(),c.appointment_id,c.id,p_diagnosis,p_prescription_instructions,p_prescription_instructions,'active',now(),now()+interval '1 year',false) returning * into rx;
 update public.prescriptions set prescription_code='RX-'||upper(substr(replace(rx.id::text,'-',''),1,10)) where id=rx.id returning * into rx;
 for i in select value from jsonb_array_elements(coalesce(p_prescription_items,'[]'::jsonb)) loop
  insert into public.prescription_items(prescription_id,product_name,medication_name,brand,form,dosage,frequency,quantity,instructions,duration_days,is_renewable,renewals_allowed,renewals_remaining,is_dispensed) values(rx.id,coalesce(i->>'product_name',i->>'medication_name','Médicament'),i->>'medication_name',i->>'brand',i->>'form',i->>'dosage',i->>'frequency',greatest(coalesce((i->>'quantity')::integer,1),1),i->>'instructions',greatest(coalesce((i->>'duration_days')::integer,1),1),false,0,0,false);
 end loop;
 return jsonb_build_object('prescription_id',rx.id,'prescription_code',rx.prescription_code,'consultation_id',c.id);
end; $$;
grant execute on function public.complete_consultation_and_issue_prescription(uuid,text,text,text,jsonb,text) to authenticated;

create or replace function public.respond_to_prescription_transfer(p_transfer_id uuid,p_status text,p_response_notes text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare ph uuid; tid uuid;
begin
 if p_status not in('accepted','rejected','completed') then raise exception 'INVALID_TRANSFER_STATUS'; end if;
 select pharmacy_id into ph from public.prescription_pharmacy_transfers where id=p_transfer_id for update; if not found then raise exception 'TRANSFER_NOT_FOUND'; end if;
 if not exists(select 1 from public.pharmacy_staff where pharmacy_id=ph and profile_id=auth.uid() and is_active=true) then raise exception 'PHARMACY_ACCESS_REQUIRED'; end if;
 update public.prescription_pharmacy_transfers set status=p_status,pharmacy_response_notes=p_response_notes,responded_at=now(),responded_by=auth.uid(),completed_at=case when p_status='completed' then now() else completed_at end,updated_at=now() where id=p_transfer_id returning id into tid; return tid;
end; $$;
grant execute on function public.respond_to_prescription_transfer(uuid,text,text) to authenticated;

create or replace function public.dispense_stock_item(p_stock_id uuid,p_quantity integer default 1) returns integer language plpgsql security definer set search_path=public as $$
declare s public.product_stocks%rowtype; after_qty integer;
begin
 if p_quantity<=0 then raise exception 'INVALID_QUANTITY'; end if;
 select * into s from public.product_stocks where product_id=p_stock_id for update; if not found then raise exception 'STOCK_NOT_FOUND'; end if;
 if not exists(select 1 from public.pharmacy_staff where pharmacy_id=s.pharmacy_id and profile_id=auth.uid() and is_active=true) then raise exception 'PHARMACY_ACCESS_REQUIRED'; end if;
 if s.current_quantity<p_quantity then raise exception 'INSUFFICIENT_STOCK'; end if;
 after_qty:=s.current_quantity-p_quantity; update public.product_stocks set current_quantity=after_qty,updated_at=now() where product_id=s.product_id and pharmacy_id=s.pharmacy_id;
 insert into public.stock_movements(product_id,pharmacy_id,movement_type,quantity_change,quantity_before,quantity_after,reference_type,notes,performed_by) values(s.product_id,s.pharmacy_id,'sale',-p_quantity,s.current_quantity,after_qty,'manual_dispense','Délivrance pharmacie',auth.uid()); return after_qty;
end; $$;
grant execute on function public.dispense_stock_item(uuid,integer) to authenticated;

-- Minimum role-aware reads/writes for the three applications.
drop policy if exists doctor_own_appointments_select on public.appointments;
create policy doctor_own_appointments_select on public.appointments for select to authenticated using(doctor_id=auth.uid());
drop policy if exists doctor_own_slots_manage on public.doctor_slots;
create policy doctor_own_slots_manage on public.doctor_slots for all to authenticated using(doctor_id=auth.uid()) with check(doctor_id=auth.uid());
drop policy if exists doctor_own_consultations_select on public.consultations;
create policy doctor_own_consultations_select on public.consultations for select to authenticated using(doctor_id=auth.uid());
drop policy if exists doctor_own_consultations_insert on public.consultations;
create policy doctor_own_consultations_insert on public.consultations for insert to authenticated with check(doctor_id=auth.uid());
drop policy if exists doctor_own_consultations_update on public.consultations;
create policy doctor_own_consultations_update on public.consultations for update to authenticated using(doctor_id=auth.uid()) with check(doctor_id=auth.uid());
drop policy if exists pharmacy_staff_self_select on public.pharmacy_staff;
create policy pharmacy_staff_self_select on public.pharmacy_staff for select to authenticated using(profile_id=auth.uid());
drop policy if exists pharmacy_staff_stock_select on public.product_stocks;
create policy pharmacy_staff_stock_select on public.product_stocks for select to authenticated using(exists(select 1 from public.pharmacy_staff s where s.pharmacy_id=product_stocks.pharmacy_id and s.profile_id=auth.uid() and s.is_active=true));
drop policy if exists pharmacy_staff_fulfillment_select on public.order_fulfillments;
create policy pharmacy_staff_fulfillment_select on public.order_fulfillments for select to authenticated using(exists(select 1 from public.pharmacy_staff s where s.pharmacy_id=order_fulfillments.pharmacy_id and s.profile_id=auth.uid() and s.is_active=true));
drop policy if exists pharmacy_staff_transfers_select on public.prescription_pharmacy_transfers;
create policy pharmacy_staff_transfers_select on public.prescription_pharmacy_transfers for select to authenticated using(exists(select 1 from public.pharmacy_staff s where s.pharmacy_id=prescription_pharmacy_transfers.pharmacy_id and s.profile_id=auth.uid() and s.is_active=true));
drop policy if exists patient_own_transfers_select on public.prescription_pharmacy_transfers;
create policy patient_own_transfers_select on public.prescription_pharmacy_transfers for select to authenticated using(patient_id=auth.uid());
drop policy if exists patient_insurances_self_select on public.patient_insurances;
create policy patient_insurances_self_select on public.patient_insurances for select to authenticated using(patient_id=auth.uid());
drop policy if exists insurance_providers_active_select on public.insurance_providers;
create policy insurance_providers_active_select on public.insurance_providers for select to authenticated using(is_active=true);
drop policy if exists payments_patient_select on public.payments;
create policy payments_patient_select on public.payments for select to authenticated using(patient_id=auth.uid());
drop policy if exists medical_record_entries_patient_select on public.medical_record_entries;
create policy medical_record_entries_patient_select on public.medical_record_entries for select to authenticated using(exists(select 1 from public.medical_dossiers d where d.id=dossier_id and d.patient_id=auth.uid()));
