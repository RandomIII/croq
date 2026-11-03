-- Test d'intégration à lancer dans le SQL Editor APRÈS schema.sql.
-- Données artificielles isolées dans une transaction entièrement annulée.
begin;
insert into auth.users(id,raw_user_meta_data) values
 ('11111111-1c01-4000-8000-111111111111','{"full_name":"Compte de test A"}'),
 ('22222222-1c02-4000-8000-222222222222','{"full_name":"Compte de test B"}');
insert into public.products(id,name,brand) values ('__test_rls','Produit de test','quick');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1c01-4000-8000-111111111111',true);
insert into public.reviews(user_id,product_id,rating,body) values
 ('11111111-1c01-4000-8000-111111111111','__test_rls',4,'Avis de test suffisamment long pour être valide.');
do $$
begin
 if not exists(select from public.public_reviews where product_id='__test_rls' and rating=4) then raise exception 'Lecture de son avis impossible'; end if;
 if not exists(select from public.product_ratings where product_id='__test_rls' and count=1 and average=4) then raise exception 'Agrégation incorrecte'; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-1c02-4000-8000-222222222222',true);
do $$
declare affected int;
begin
 update public.reviews set body='Tentative de modification depuis un autre compte.' where product_id='__test_rls';
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Échec RLS : modification croisée autorisée'; end if;
 delete from public.reviews where product_id='__test_rls';
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Échec RLS : suppression croisée autorisée'; end if;
 begin
  insert into public.reviews(user_id,product_id,rating,body) values('11111111-1c01-4000-8000-111111111111','__test_rls',5,'Tentative d’usurpation de compte depuis un autre utilisateur.');
  raise exception 'Échec RLS : insertion usurpée autorisée';
 exception when insufficient_privilege then null;
 when raise_exception then
  -- Le limiteur bloque aussi une usurpation si l'auteur a publié récemment.
  if sqlerrm not like 'Attends 30 secondes%' then raise; end if;
 end;
 begin
  insert into public.reviews(user_id,product_id,rating,body) values('22222222-1c02-4000-8000-222222222222','__test_rls',9,'Une note hors limites doit être refusée par la base.');
  raise exception 'Une note hors limites a été acceptée';
 exception when check_violation then null;
 end;
end $$;
reset role;
rollback;
select 'Tests terminés : lecture, agrégation, isolation des comptes et validation des notes.' as resultat;
