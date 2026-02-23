-- ChinaLegal RLS for anonymous chat system
-- Assumes Prisma tables are in public schema and User.id == auth.users.id

alter table public."Conversation" enable row level security;
alter table public."ChatMessage" enable row level security;
alter table public."DisclaimerAcceptance" enable row level security;

do $$
begin
  alter publication supabase_realtime add table public."ChatMessage";
exception
  when duplicate_object then null;
end $$;

create policy "conversation_select_participants"
on public."Conversation"
for select
to authenticated
using (
  exists (
    select 1
    from public."ClientProfile" cp
    where cp.id = "Conversation"."clientProfileId"
      and cp."userId" = auth.uid()
  )
  or exists (
    select 1
    from public."AttorneyProfile" ap
    where ap.id = "Conversation"."attorneyProfileId"
      and ap."userId" = auth.uid()
  )
);

create policy "conversation_update_client_accept"
on public."Conversation"
for update
to authenticated
using (
  exists (
    select 1
    from public."ClientProfile" cp
    where cp.id = "Conversation"."clientProfileId"
      and cp."userId" = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public."ClientProfile" cp
    where cp.id = "Conversation"."clientProfileId"
      and cp."userId" = auth.uid()
  )
);

create policy "chatmessage_select_participants"
on public."ChatMessage"
for select
to authenticated
using (
  exists (
    select 1
    from public."Conversation" c
    join public."ClientProfile" cp on cp.id = c."clientProfileId"
    where c.id = "ChatMessage"."conversationId"
      and cp."userId" = auth.uid()
  )
  or exists (
    select 1
    from public."Conversation" c
    join public."AttorneyProfile" ap on ap.id = c."attorneyProfileId"
    where c.id = "ChatMessage"."conversationId"
      and ap."userId" = auth.uid()
  )
);

create policy "chatmessage_insert_participants"
on public."ChatMessage"
for insert
to authenticated
with check (
  "ChatMessage"."senderUserId" = auth.uid()
  and (
    exists (
      select 1
      from public."Conversation" c
      join public."ClientProfile" cp on cp.id = c."clientProfileId"
      where c.id = "ChatMessage"."conversationId"
        and cp."userId" = auth.uid()
    )
    or exists (
      select 1
      from public."Conversation" c
      join public."AttorneyProfile" ap on ap.id = c."attorneyProfileId"
      where c.id = "ChatMessage"."conversationId"
        and ap."userId" = auth.uid()
    )
  )
);

create policy "disclaimer_select_participants"
on public."DisclaimerAcceptance"
for select
to authenticated
using (
  exists (
    select 1
    from public."Conversation" c
    join public."ClientProfile" cp on cp.id = c."clientProfileId"
    where c.id = "DisclaimerAcceptance"."conversationId"
      and cp."userId" = auth.uid()
  )
  or exists (
    select 1
    from public."Conversation" c
    join public."AttorneyProfile" ap on ap.id = c."attorneyProfileId"
    where c.id = "DisclaimerAcceptance"."conversationId"
      and ap."userId" = auth.uid()
  )
);

create policy "disclaimer_insert_self"
on public."DisclaimerAcceptance"
for insert
to authenticated
with check ("DisclaimerAcceptance"."userId" = auth.uid());

create policy "disclaimer_update_self"
on public."DisclaimerAcceptance"
for update
to authenticated
using ("DisclaimerAcceptance"."userId" = auth.uid())
with check ("DisclaimerAcceptance"."userId" = auth.uid());
