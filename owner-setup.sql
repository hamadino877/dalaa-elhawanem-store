-- ===== شغّليه مرة واحدة: Supabase → SQL Editor → New query → Run =====

-- 1) جدول الطلبات
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  customer_name text, phone text, address text, payment_method text,
  items jsonb not null default '[]',
  subtotal numeric default 0, discount numeric default 0, owner_discount numeric default 0,
  total numeric default 0, deposit numeric default 0, coupon_code text,
  status text not null default 'pending',      -- pending | confirmed | delivered | cancelled
  stock_applied boolean not null default false
);
alter table public.orders enable row level security;
create policy "visitors create orders" on public.orders for insert to anon, authenticated with check (true);
create policy "owner reads orders"     on public.orders for select to authenticated using (true);
create policy "owner updates orders"   on public.orders for update to authenticated using (true) with check (true);
create policy "owner deletes orders"   on public.orders for delete to authenticated using (true);

-- 2) إعدادات الخصم
create table if not exists public.settings (
  key text primary key, value jsonb not null default '{}', updated_at timestamptz default now()
);
alter table public.settings enable row level security;
create policy "everyone reads settings" on public.settings for select to anon, authenticated using (true);
create policy "owner writes settings"   on public.settings for insert to authenticated with check (true);
create policy "owner edits settings"    on public.settings for update to authenticated using (true) with check (true);

-- 3) السماح لحساب صاحب المحل بتعديل المنتجات (المخزون والأسعار)
create policy "owner updates products" on public.products for update to authenticated using (true) with check (true);

-- 4) الخطوة اليدوية: Authentication → Users → Add user
--    الإيميل = owner@dalaa-elhawanem.com (أو غيّريه في أول سطر بملف owner-dashboard.js)
--    كلمة السر = الرقم السري للوحة صاحب المحل (اختاري واحد قوي، 8 أحرف على الأقل)
--    وفعّلي Auto Confirm User.
