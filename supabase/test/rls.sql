-- Row Level Security checks. See README for how to run.
\set ON_ERROR_STOP 1
create function expect(label text, actual bigint, expected bigint) returns void language plpgsql as $$ begin if actual is distinct from expected then raise exception 'FAIL %: got %, expected %', label, actual, expected; end if; end $$;
grant execute on function expect to authenticated;
grant all on all tables in schema public to authenticated; grant execute on all functions in schema public to authenticated;
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a','{"role":"admin"}'),
 ('00000000-0000-0000-0000-00000000000b','{"role":"vendor"}'),
 ('00000000-0000-0000-0000-00000000000c','{"role":"customer"}'),
 ('00000000-0000-0000-0000-00000000000d','{"role":"vendor"}');
select expect('sign-up cannot claim admin', count(*), 0) from profiles where role='admin';
update profiles set role='admin' where id='00000000-0000-0000-0000-00000000000a';
set role authenticated;
-- vendor B (photography) and D (catering) create listings
set test.uid='00000000-0000-0000-0000-00000000000b';
insert into vendors (owner_id,business_name,category_id,city,whatsapp) values (auth.uid(),'Studio B',7,'الرياض','966551234567');
do $$ begin update vendors set status='approved'; raise exception 'FAIL vendor self-approved'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
set test.uid='00000000-0000-0000-0000-00000000000d';
insert into vendors (owner_id,business_name,category_id,city,whatsapp) values (auth.uid(),'Cater D',4,'الرياض','966551234568');
-- customer cannot create a vendor listing, cannot see pending vendors
set test.uid='00000000-0000-0000-0000-00000000000c';
do $$ begin insert into vendors (owner_id,business_name,category_id,city,whatsapp) values (auth.uid(),'X',1,'x','966551234569'); raise exception 'FAIL customer listed'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
select expect('pending vendors hidden from customers', count(*), 0) from vendors;
-- admin approves both
set test.uid='00000000-0000-0000-0000-00000000000a';
update vendors set status='approved', verified=true;
-- an approved vendor changing category goes back to review; editing the description does not
set test.uid='00000000-0000-0000-0000-00000000000d';
update vendors set description='new menu';
select expect('description edit keeps approval', count(*), 1) from vendors where owner_id = auth.uid() and status='approved';
update vendors set category_id=7;
select expect('category change needs re-approval', count(*), 1) from vendors where owner_id = auth.uid() and status='pending';
update vendors set category_id=4;
set test.uid='00000000-0000-0000-0000-00000000000a';
update vendors set status='approved';
-- customer posts a photography request
set test.uid='00000000-0000-0000-0000-00000000000c';
insert into requests (customer_id,category_ids,event_type,city,description) values (auth.uid(),'{7}','زفاف','الرياض','need a photographer please');
select expect('approved vendors public', count(*), 2) from vendor_cards;
-- vendor D (catering) must not see it, vendor B must
set test.uid='00000000-0000-0000-0000-00000000000d';
select expect('other-category vendor cannot see request', count(*), 0) from requests;
do $$ begin insert into bids (request_id,vendor_id,price,message) select r.id, public.my_vendor_id(), 1, 'hello' from requests r; end $$;
select expect('other-category vendor cannot bid', count(*), 0) from bids;
set test.uid='00000000-0000-0000-0000-00000000000b';
select expect('matching vendor sees request', count(*), 1) from requests;
insert into bids (request_id,vendor_id,price,message) select id, public.my_vendor_id(), 3000, 'Happy to help' from requests;
do $$ begin insert into bids (request_id,vendor_id,price,message) select id, public.my_vendor_id(), 1, 'again' from requests; raise exception 'FAIL double bid'; exception when unique_violation then null; end $$;
do $$ begin insert into reviews (vendor_id, customer_id, rating) select id, auth.uid(), 1 from vendors where business_name='Cater D'; raise exception 'FAIL vendor reviewed a competitor'; exception when insufficient_privilege then null; end $$;
-- customer sees bid, marks seen; vendor B sees seen_at
set test.uid='00000000-0000-0000-0000-00000000000c';
select expect('owner sees bids', count(*), 1) from bids;
select mark_bids_seen(id) from requests;
set test.uid='00000000-0000-0000-0000-00000000000b';
select expect('seen stamped', count(*), 1) from bids where seen_at is not null;
-- vendor cannot review self; customer reviews once
set test.uid='00000000-0000-0000-0000-00000000000c';
insert into reviews (vendor_id, customer_id, rating) select id, auth.uid(), 5 from vendors where business_name='Studio B';
select expect('rating summary', review_count, 1) from vendor_cards where business_name='Studio B';
do $$ begin insert into reviews (vendor_id, customer_id, rating) select id, auth.uid(), 1 from vendors where business_name='Studio B'; raise exception 'FAIL double review'; exception when unique_violation then null; end $$;
-- anonymous: no requests, approved vendors only
set test.uid='';
select expect('anon sees no requests', count(*), 0) from requests;
select expect('anon sees no bids', count(*), 0) from bids;
\echo RLS checks passed
