-- HomeTurn — Schema completo

-- Profiles (linked to auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text not null,
  avatar_url text,
  color text not null default '#6366f1',
  created_at timestamptz default now()
);

-- Households
create table if not exists households (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz default now()
);

-- Household Members
create table if not exists household_members (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references households(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  unique(household_id, profile_id)
);

-- Chore Definitions
create table if not exists chore_definitions (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references households(id) on delete cascade not null,
  name text not null,
  category text not null default 'general',
  difficulty text not null default 'medium' check (difficulty in ('light', 'medium', 'heavy')),
  icon text not null default '🧹',
  created_at timestamptz default now()
);

-- Weekly Assignments
create table if not exists weekly_assignments (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references households(id) on delete cascade not null,
  week_start date not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  chore_id uuid references chore_definitions(id) on delete cascade not null,
  day_of_week text not null check (day_of_week in ('monday','tuesday','wednesday','thursday','friday')),
  completed boolean default false,
  created_at timestamptz default now()
);

-- Schedule Templates
create table if not exists schedule_templates (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references households(id) on delete cascade not null,
  name text not null,
  description text not null default '',
  preview_data jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Change Proposals (voting system)
create table if not exists change_proposals (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references households(id) on delete cascade not null,
  proposed_by uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('add_chore','remove_chore','reassign','apply_template')),
  description text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  votes_needed integer not null default 3,
  created_at timestamptz default now()
);

-- Proposal Votes
create table if not exists proposal_votes (
  id uuid default gen_random_uuid() primary key,
  proposal_id uuid references change_proposals(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  vote boolean not null,
  voted_at timestamptz default now(),
  unique(proposal_id, profile_id)
);

-- Task Lists
create table if not exists task_lists (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references households(id) on delete cascade not null,
  name text not null,
  type text not null default 'todo' check (type in ('shopping','todo','custom')),
  color text not null default '#6366f1',
  icon text not null default '📋',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Task Items
create table if not exists task_items (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references task_lists(id) on delete cascade not null,
  title text not null,
  description text,
  completed boolean default false,
  completed_by uuid references profiles(id) on delete set null,
  completed_at timestamptz,
  due_date date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  sort_order integer not null default 0
);

-- Row Level Security
alter table profiles enable row level security;
alter table households enable row level security;
alter table household_members enable row level security;
alter table chore_definitions enable row level security;
alter table weekly_assignments enable row level security;
alter table schedule_templates enable row level security;
alter table change_proposals enable row level security;
alter table proposal_votes enable row level security;
alter table task_lists enable row level security;
alter table task_items enable row level security;

-- RLS Policies: profiles
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- RLS Policies: households (members can see their household)
create policy "Members can view household" on households for select
  using (exists (select 1 from household_members where household_id = households.id and profile_id = auth.uid()));
create policy "Anyone can create household" on households for insert with check (true);

-- RLS Policies: household_members
create policy "Members can view members" on household_members for select
  using (exists (select 1 from household_members hm where hm.household_id = household_members.household_id and hm.profile_id = auth.uid()));
create policy "Users can join household" on household_members for insert with check (profile_id = auth.uid());

-- RLS Policies: chore_definitions
create policy "Members can view chores" on chore_definitions for select
  using (exists (select 1 from household_members where household_id = chore_definitions.household_id and profile_id = auth.uid()));
create policy "Members can insert chores" on chore_definitions for insert
  with check (exists (select 1 from household_members where household_id = chore_definitions.household_id and profile_id = auth.uid()));
create policy "Members can delete chores" on chore_definitions for delete
  using (exists (select 1 from household_members where household_id = chore_definitions.household_id and profile_id = auth.uid()));

-- RLS Policies: weekly_assignments
create policy "Members can view assignments" on weekly_assignments for select
  using (exists (select 1 from household_members where household_id = weekly_assignments.household_id and profile_id = auth.uid()));
create policy "Members can insert assignments" on weekly_assignments for insert
  with check (exists (select 1 from household_members where household_id = weekly_assignments.household_id and profile_id = auth.uid()));
create policy "Members can update assignments" on weekly_assignments for update
  using (exists (select 1 from household_members where household_id = weekly_assignments.household_id and profile_id = auth.uid()));
create policy "Members can delete assignments" on weekly_assignments for delete
  using (exists (select 1 from household_members where household_id = weekly_assignments.household_id and profile_id = auth.uid()));

-- RLS Policies: schedule_templates
create policy "Members can view templates" on schedule_templates for select
  using (exists (select 1 from household_members where household_id = schedule_templates.household_id and profile_id = auth.uid()));
create policy "Members can insert templates" on schedule_templates for insert
  with check (exists (select 1 from household_members where household_id = schedule_templates.household_id and profile_id = auth.uid()));

-- RLS Policies: change_proposals
create policy "Members can view proposals" on change_proposals for select
  using (exists (select 1 from household_members where household_id = change_proposals.household_id and profile_id = auth.uid()));
create policy "Members can insert proposals" on change_proposals for insert
  with check (exists (select 1 from household_members where household_id = change_proposals.household_id and profile_id = auth.uid()));
create policy "Members can update proposals" on change_proposals for update
  using (exists (select 1 from household_members where household_id = change_proposals.household_id and profile_id = auth.uid()));

-- RLS Policies: proposal_votes
create policy "Members can view votes" on proposal_votes for select
  using (exists (
    select 1 from change_proposals cp
    join household_members hm on hm.household_id = cp.household_id
    where cp.id = proposal_votes.proposal_id and hm.profile_id = auth.uid()
  ));
create policy "Members can vote" on proposal_votes for insert
  with check (profile_id = auth.uid());
create policy "Members can update own vote" on proposal_votes for update
  using (profile_id = auth.uid());

-- RLS Policies: task_lists
create policy "Members can view task lists" on task_lists for select
  using (exists (select 1 from household_members where household_id = task_lists.household_id and profile_id = auth.uid()));
create policy "Members can insert task lists" on task_lists for insert
  with check (exists (select 1 from household_members where household_id = task_lists.household_id and profile_id = auth.uid()));
create policy "Members can update task lists" on task_lists for update
  using (exists (select 1 from household_members where household_id = task_lists.household_id and profile_id = auth.uid()));
create policy "Members can delete task lists" on task_lists for delete
  using (exists (select 1 from household_members where household_id = task_lists.household_id and profile_id = auth.uid()));

-- RLS Policies: task_items
create policy "Members can view items" on task_items for select
  using (exists (
    select 1 from task_lists tl
    join household_members hm on hm.household_id = tl.household_id
    where tl.id = task_items.list_id and hm.profile_id = auth.uid()
  ));
create policy "Members can insert items" on task_items for insert
  with check (exists (
    select 1 from task_lists tl
    join household_members hm on hm.household_id = tl.household_id
    where tl.id = task_items.list_id and hm.profile_id = auth.uid()
  ));
create policy "Members can update items" on task_items for update
  using (exists (
    select 1 from task_lists tl
    join household_members hm on hm.household_id = tl.household_id
    where tl.id = task_items.list_id and hm.profile_id = auth.uid()
  ));
create policy "Members can delete items" on task_items for delete
  using (exists (
    select 1 from task_lists tl
    join household_members hm on hm.household_id = tl.household_id
    where tl.id = task_items.list_id and hm.profile_id = auth.uid()
  ));

-- Trigger: auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, name, avatar_url, color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    '#' || lpad(to_hex(floor(random() * 16777215)::int), 6, '0')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
