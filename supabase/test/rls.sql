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
-- no review without a completed booking; no booking without an event date
set test.uid='00000000-0000-0000-0000-00000000000c';
do $$ begin insert into reviews (vendor_id, customer_id, rating) select id, auth.uid(), 5 from vendors where business_name='Studio B'; raise exception 'FAIL review without booking'; exception when insufficient_privilege then null; end $$;
do $$ begin perform accept_bid(id) from bids; raise exception 'FAIL booked without a date'; exception when sqlstate 'P0002' then null; end $$;
-- request owner can close via the function but not edit fields directly
update requests set expires_at = now() + interval '1 year';
select expect('customer cannot edit request fields', count(*), 0) from requests where expires_at > now() + interval '30 days';
select close_request(id) from requests;
select expect('customer closed request', count(*), 1) from requests where status = 'closed';
-- vendor still sees the closed request they bid on
set test.uid='00000000-0000-0000-0000-00000000000b';
select expect('vendor sees closed request they bid on', count(*), 1) from requests;
-- direct inquiry to one supplier, quote, revision, booking, review
set test.uid='00000000-0000-0000-0000-00000000000c';
insert into requests (customer_id,category_ids,event_type,city,description,event_date,vendor_id)
  select auth.uid(),'{4}','x','x','catering for 80 guests',current_date,id from vendors where business_name='Cater D';
set test.uid='00000000-0000-0000-0000-00000000000b';
select expect('other vendor cannot see a direct inquiry', count(*), 0) from requests where vendor_id is not null;
set test.uid='00000000-0000-0000-0000-00000000000d';
select expect('chosen vendor sees the inquiry', count(*), 1) from requests where vendor_id is not null;
insert into bids (request_id,vendor_id,price,message,includes) select id, public.my_vendor_id(), 5000, 'Buffet for 80', 'Staff and plates' from requests where vendor_id is not null;
select revise_bid(id, 4500, 'Buffet for 80, revised', 'Staff', current_date + 3) from bids;
do $$ begin perform accept_bid(id) from bids; raise exception 'FAIL vendor accepted own quote'; exception when insufficient_privilege then null; end $$;
set test.uid='00000000-0000-0000-0000-00000000000c';
select expect('revised quote shows as unseen', count(*), 1) from bids where price = 4500 and seen_at is null;
select accept_bid(b.id) from bids b join requests r on r.id = b.request_id where r.vendor_id is not null;
do $$ begin perform accept_bid(b.id) from bids b join requests r on r.id = b.request_id where r.vendor_id is not null; raise exception 'FAIL double booking'; exception when unique_violation then null; end $$;
select expect('booking keeps agreed terms', count(*), 1) from bookings where price = 4500 and terms like 'Buffet for 80, revised%Staff' and status = 'requested';
do $$ begin perform set_booking_status(id, 'confirmed') from bookings; raise exception 'FAIL customer confirmed'; exception when insufficient_privilege then null; end $$;
set test.uid='00000000-0000-0000-0000-00000000000b';
select expect('other vendor cannot see the booking', count(*), 0) from bookings;
do $$ begin perform set_booking_status('00000000-0000-0000-0000-000000000000', 'confirmed'); raise exception 'FAIL'; exception when insufficient_privilege then null; end $$;
set test.uid='00000000-0000-0000-0000-00000000000d';
select set_booking_status(id, 'confirmed') from bookings;
select expect('confirmed date is blocked', count(*), 1) from busy_vendor_ids(current_date);
do $$ begin insert into bookings (bid_id,vendor_id,customer_id,price,terms,event_date) select bid_id,vendor_id,customer_id,1,'x',event_date from bookings; raise exception 'FAIL direct booking insert'; exception when insufficient_privilege then null; end $$;
set test.uid='00000000-0000-0000-0000-00000000000c';
do $$ begin insert into reviews (vendor_id, customer_id, rating) select vendor_id, auth.uid(), 5 from bookings; raise exception 'FAIL review before completion'; exception when insufficient_privilege then null; end $$;
select set_booking_status(id, 'completed') from bookings;
insert into reviews (vendor_id, customer_id, rating) select vendor_id, auth.uid(), 5 from bookings;
select expect('rating summary', review_count, 1) from vendor_cards where business_name='Cater D';
do $$ begin insert into reviews (vendor_id, customer_id, rating) select vendor_id, auth.uid(), 1 from bookings; raise exception 'FAIL double review'; exception when unique_violation then null; end $$;
set test.uid='00000000-0000-0000-0000-00000000000b';
select reply_review(id, 'not my review') from reviews;
set test.uid='00000000-0000-0000-0000-00000000000d';
select reply_review(id, 'Thank you!') from reviews;
select reply_review(id, 'second reply') from reviews;
select expect('supplier replies once', count(*), 1) from reviews where vendor_reply = 'Thank you!';
set test.uid='00000000-0000-0000-0000-00000000000b';
select report_review(id) from reviews;
select expect('review reported', count(*), 1) from reviews where reported_at is not null;
set test.uid='00000000-0000-0000-0000-00000000000c';
select close_request(id) from requests where vendor_id is not null;
-- at most 5 open requests per customer
set test.uid='00000000-0000-0000-0000-00000000000c';
insert into requests (customer_id,category_ids,event_type,city,description) select auth.uid(),'{7}','x','x','spam spam spam' from generate_series(1,5);
do $$ begin insert into requests (customer_id,category_ids,event_type,city,description) values (auth.uid(),'{7}','x','x','spam spam spam'); raise exception 'FAIL sixth open request'; exception when insufficient_privilege then null; end $$;
-- a rejected vendor that edits goes back to pending
set test.uid='00000000-0000-0000-0000-00000000000a';
update vendors set status='rejected' where business_name='Cater D';
set test.uid='00000000-0000-0000-0000-00000000000d';
update vendors set description='fixed it';
select expect('rejected listing re-queued on edit', count(*), 1) from vendors where owner_id = auth.uid() and status='pending';
-- the dashboard (not the website role) can change status
reset role;
update vendors set status='approved' where business_name='Cater D';
select expect('dashboard can approve', count(*), 2) from vendors where status='approved';
set role authenticated;
-- anonymous: no requests, approved vendors only
set test.uid='';
select expect('anon sees no requests', count(*), 0) from requests;
select expect('anon sees no bids', count(*), 0) from bids;
-- signed-out visitors cannot call actions or trigger code
reset role;
set role anon;
do $$ begin perform close_request('00000000-0000-0000-0000-000000000000'); raise exception 'FAIL anon called close_request'; exception when insufficient_privilege then null; end $$;
do $$ begin perform accept_bid('00000000-0000-0000-0000-000000000000'); raise exception 'FAIL anon called accept_bid'; exception when insufficient_privilege then null; end $$;
reset role;
\echo RLS checks passed
