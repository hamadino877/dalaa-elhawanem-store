-- ===== شغّليه مرة واحدة: Supabase → SQL Editor → New query → Run =====
-- النسخة بدون يوزر: اللوحة تفتح برقم سري في الكود (101010) مباشرة

-- 1) جدول الطلبات
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  customer_name text, phone text, address text, payment_method text,
  items jsonb not null default '[]',
  subtotal numeric default 0, discount numeric default 0, owner_discount numeric default 0,
  total numeric default 0, deposit numeric default 0, coupon_code text,
  status text not null default 'pending',
  stock_applied boolean not null default false
);
alter table public.orders enable row level security;
create policy "visitors create orders" on public.orders for insert to anon, authenticated with check (true);
create policy "anyone reads orders"     on public.orders for select to anon, authenticated using (true);
create policy "anyone updates orders"   on public.orders for update to anon, authenticated using (true) with check (true);
create policy "anyone deletes orders"   on public.orders for delete to anon, authenticated using (true);

-- 2) إعدادات الخصم
create table if not exists public.settings (
  key text primary key, value jsonb not null default '{}', updated_at timestamptz default now()
);
alter table public.settings enable row level security;
create policy "everyone reads settings" on public.settings for select to anon, authenticated using (true);
create policy "anyone writes settings"  on public.settings for insert to anon, authenticated with check (true);
create policy "anyone edits settings"   on public.settings for update to anon, authenticated using (true) with check (true);

-- 3) السماح بتعديل المنتجات (المخزون والأسعار) من غير تسجيل دخول
create policy "anyone updates products" on public.products for update to anon, authenticated using (true) with check (true);

-- 4) مفيش يوزر مطلوب — امسحي اليوزر القديم من Authentication → Users لو موجود
