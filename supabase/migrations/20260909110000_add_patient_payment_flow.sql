create or replace function public.simulate_order_payment(p_order_id uuid,p_payment_method text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; p public.payments%rowtype;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  select * into o from public.orders where id=p_order_id and patient_id=auth.uid() for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if p_payment_method not in ('tmoney','yas','moov_money','gozem','card','cash_on_delivery','cash_in_person') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if o.payment_status='succeeded' then return jsonb_build_object('order_id',o.id,'status','succeeded'); end if;
  insert into public.payments(order_id,patient_id,amount,currency,payment_method,status,metadata,initiated_at,completed_at)
  values(o.id,auth.uid(),o.patient_amount,o.currency,p_payment_method,'succeeded',jsonb_build_object('simulation',true),now(),now()) returning * into p;
  update public.orders set payment_method=p_payment_method,payment_status='succeeded',status='confirmed',updated_at=now() where id=o.id returning * into o;
  return jsonb_build_object('order_id',o.id,'payment_id',p.id,'status','succeeded','amount',o.patient_amount,'order_number',o.order_number);
end; $$;
grant execute on function public.simulate_order_payment(uuid,text) to authenticated;
