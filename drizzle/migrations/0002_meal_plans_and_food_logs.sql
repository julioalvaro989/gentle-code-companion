create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_date date not null,
  meals jsonb not null,
  total_calories integer,
  created_at timestamptz not null default now(),
  constraint meal_plans_user_date_unique unique (user_id, plan_date)
);
grant select, insert, delete on public.meal_plans to authenticated;
grant all on public.meal_plans to service_role;
alter table public.meal_plans enable row level security;
create policy meal_plans_select_own on public.meal_plans for select to authenticated using (user_id = (select auth.uid()));
create policy meal_plans_insert_own on public.meal_plans for insert to authenticated with check (user_id = (select auth.uid()));
create policy meal_plans_delete_own on public.meal_plans for delete to authenticated using (user_id = (select auth.uid()));

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  local_date date not null,
  meal_type text not null default 'lanche',
  food_name text not null check (char_length(food_name) between 1 and 200),
  quantity text not null default '' check (char_length(quantity) <= 100),
  calories integer not null default 0 check (calories between 0 and 10000),
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  created_at timestamptz not null default now()
);
create index food_logs_user_date_idx on public.food_logs (user_id, local_date);
grant select, insert, update, delete on public.food_logs to authenticated;
grant all on public.food_logs to service_role;
alter table public.food_logs enable row level security;
create policy food_logs_select_own on public.food_logs for select to authenticated using (user_id = (select auth.uid()));
create policy food_logs_insert_own on public.food_logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy food_logs_update_own on public.food_logs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy food_logs_delete_own on public.food_logs for delete to authenticated using (user_id = (select auth.uid()));