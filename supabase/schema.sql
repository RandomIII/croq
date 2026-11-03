-- À exécuter une fois dans le SQL Editor d'un nouveau projet Supabase.
begin;
create table public.products (
  id text primary key,
  name text not null,
  brand text not null check (brand in ('mcdonalds','burgerking','quick','kfc'))
);
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80)
);
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  product_id text not null references public.products,
  rating smallint not null check(rating between 1 and 5),
  body text not null check(char_length(trim(body)) between 20 and 2000),
  restaurant text not null default '' check(char_length(restaurant)<=120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,product_id)
);
create index reviews_product_idx on public.reviews(product_id,updated_at desc);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  review_id uuid not null references public.reviews on delete cascade,
  reason text not null check(char_length(reason) between 5 and 500),
  created_at timestamptz not null default now(),
  unique(user_id,review_id)
);
-- L'identité publique est dérivée du compte Discord, jamais d'un formulaire client.
create function public.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),nullif(new.raw_user_meta_data->>'name',''),'Gourmand'),80));
 return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();
insert into public.profiles(id,display_name)
 select id,left(coalesce(nullif(raw_user_meta_data->>'full_name',''),nullif(raw_user_meta_data->>'name',''),'Gourmand'),80) from auth.users on conflict do nothing;
create function public.check_review_write() returns trigger language plpgsql set search_path = '' as $$
begin
 -- Verrou par utilisateur : deux requêtes concurrentes ne contournent pas la limite.
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 if exists(select 1 from public.reviews where user_id=new.user_id and updated_at>now()-interval '30 seconds') then
   raise exception 'Attends 30 secondes entre deux publications ou modifications.';
 end if;
 new.updated_at=now();
 if tg_op='INSERT' then new.created_at=now();
 else new.created_at=old.created_at;new.user_id=old.user_id;new.product_id=old.product_id; end if;
 return new;
end;
$$;
create trigger review_write before insert or update on public.reviews for each row execute function public.check_review_write();
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
create policy products_read on public.products for select using(true);
create policy profiles_read on public.profiles for select using(true);
create policy reviews_read on public.reviews for select using(true);
create policy reviews_insert on public.reviews for insert to authenticated with check((select auth.uid())=user_id);
create policy reviews_update on public.reviews for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy reviews_delete on public.reviews for delete to authenticated using((select auth.uid())=user_id);
create policy reports_insert on public.reports for insert to authenticated with check((select auth.uid())=user_id);
-- Les signalements ne sont lisibles que depuis le tableau de bord administrateur.
create view public.public_reviews with(security_invoker=true) as
 select r.id,r.user_id,r.product_id,r.rating,r.body,r.restaurant,r.created_at,r.updated_at,p.display_name
 from public.reviews r join public.profiles p on p.id=r.user_id;
create view public.product_ratings with(security_invoker=true) as
 select product_id,round(avg(rating),2) as average,count(*)::int as count from public.reviews group by product_id;
revoke all on public.products,public.profiles,public.reviews,public.reports from anon,authenticated;
grant select on public.products,public.profiles,public.reviews,public.public_reviews,public.product_ratings to anon,authenticated;
grant insert(user_id,product_id,rating,body,restaurant),update(user_id,product_id,rating,body,restaurant),delete on public.reviews to authenticated;
grant insert(user_id,review_id,reason) on public.reports to authenticated;
create function public.delete_my_account() returns void language plpgsql security definer set search_path = '' as $$
declare target uuid := auth.uid();
begin
 if target is null then raise exception 'Authentification requise'; end if;
 delete from auth.users where id=target;
end;
$$;
revoke all on function public.delete_my_account() from public,anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.create_profile() from public,anon,authenticated;
commit;
