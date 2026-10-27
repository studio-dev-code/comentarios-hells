create table public.comments (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(trim(name)) between 2 and 80),
    rating smallint not null check (rating between 1 and 5),
    content text not null check (char_length(trim(content)) between 2 and 2000),
    status text not null default 'pending' check (status in ('pending', 'approved')),
    created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

revoke all on table public.comments from anon, authenticated;
grant select on table public.comments to anon, authenticated;
grant insert (name, rating, content) on table public.comments to anon, authenticated;
grant update (status) on table public.comments to authenticated;
grant delete on table public.comments to authenticated;

create policy "Anyone can read published comments"
    on public.comments
    for select
    to anon, authenticated
    using (status = 'approved');

create policy "Managers can read all comments"
    on public.comments
    for select
    to authenticated
    using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Anyone can submit pending comments"
    on public.comments
    for insert
    to anon, authenticated
    with check (status = 'pending');

create policy "Managers can publish comments"
    on public.comments
    for update
    to authenticated
    using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    with check (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        and status in ('pending', 'approved')
    );

create policy "Managers can delete comments"
    on public.comments
    for delete
    to authenticated
    using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
