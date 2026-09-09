create or replace function public.carelink_order_after_insert() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.order_fulfillments(order_id,pharmacy_id,fulfillment_number,subtotal_amount,status) values(new.id,new.pharmacy_id,'FUL-'||upper(substr(replace(new.id::text,'-',''),1,10)),new.total_amount,'pending') on conflict do nothing; return new; end; $$;
drop trigger if exists trg_carelink_order_after_insert on public.orders;
create trigger trg_carelink_order_after_insert after insert on public.orders for each row execute function public.carelink_order_after_insert();

create or replace function public.carelink_order_item_after_insert() returns trigger language plpgsql security definer set search_path=public as $$ declare f uuid; begin if new.order_fulfillment_id is null then select id into f from public.order_fulfillments where order_id=new.order_id limit 1; if f is not null then update public.order_items set order_fulfillment_id=f where id=new.id; end if; end if; return new; end; $$;
drop trigger if exists trg_carelink_order_item_after_insert on public.order_items;
create trigger trg_carelink_order_item_after_insert after insert on public.order_items for each row execute function public.carelink_order_item_after_insert();
