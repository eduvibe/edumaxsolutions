-- ─────────────────────────────────────────────────────────────────────────────
-- Bravo CBT — orders table
-- Run this once in your Supabase SQL editor (or via supabase db push).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.bravo_orders (
  -- Primary key — also used as Paystack reference (UUID fits Paystack's ref field)
  id                  uuid primary key default gen_random_uuid(),

  -- Buyer details
  email               text not null,

  -- Plan
  kind                text not null check (kind in ('new', 'renewal')),
  amount_kobo         integer not null,  -- price in kobo (₦4000 = 400000)

  -- Device identity
  product_id          text not null,     -- e.g. BCBT-YDR9-G5WQ-0860

  -- Lifecycle
  status              text not null default 'pending'
                        check (status in ('pending', 'paid', 'failed')),
  activation_key      text,              -- set by webhook after payment confirmed
  paystack_reference  text,              -- Paystack transaction reference (= id)
  paid_at             timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bravo_orders_updated_at on public.bravo_orders;
create trigger bravo_orders_updated_at
  before update on public.bravo_orders
  for each row execute procedure public.set_updated_at();

-- Index for fast status polling by order id (primary key already indexed)
-- Index for looking up orders by product_id (admin queries)
create index if not exists bravo_orders_product_id_idx on public.bravo_orders (product_id);
create index if not exists bravo_orders_status_idx      on public.bravo_orders (status);
create index if not exists bravo_orders_email_idx       on public.bravo_orders (email);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Public reads are blocked — only the service role key (used in API routes)
-- can read/write this table.

alter table public.bravo_orders enable row level security;

-- No policies = deny all for anon/authenticated roles.
-- API routes use the service role key which bypasses RLS entirely.

-- ─── Grant to service role (already implicit, but explicit is clearer) ────────
grant all on public.bravo_orders to service_role;
