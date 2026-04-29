-- ============================================================
-- Malachi - 初期スキーマ
-- ============================================================

-- UUID 拡張
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM 型
-- ============================================================

create type subscription_status as enum ('free', 'active', 'cancelled', 'expired');
create type subscription_plan   as enum ('free', 'standard');
create type question_context    as enum ('love', 'relationships', 'self', 'work', 'decision');
create type spread_type         as enum ('single', 'two_card', 'three_card');
create type crisis_level        as enum ('none', 'moderate', 'severe');

-- ============================================================
-- users
-- LINE ユーザー情報 + 同意記録
-- ============================================================

create table users (
  id                 uuid        primary key default uuid_generate_v4(),
  line_user_id       text        unique not null,
  display_name       text,
  picture_url        text,
  -- LINE 初回利用時に取得する同意タイムスタンプ(MVP 公開前に実装必須)
  consent_terms_at   timestamptz,
  consent_privacy_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ============================================================
-- subscriptions
-- users と 1:1。ユーザー作成時に free 行を INSERT する
-- ============================================================

create table subscriptions (
  id                       uuid                primary key default uuid_generate_v4(),
  user_id                  uuid                not null references users(id) on delete cascade,
  status                   subscription_status not null default 'free',
  plan                     subscription_plan   not null default 'free',
  started_at               timestamptz,
  expires_at               timestamptz,
  -- Stripe 連携(決済方式確定後に利用)
  stripe_customer_id       text,
  stripe_subscription_id   text,
  created_at               timestamptz         not null default now(),
  updated_at               timestamptz         not null default now()
);

create unique index subscriptions_user_id_key on subscriptions(user_id);

-- ============================================================
-- conversations
-- LINE セッション単位の会話記録
-- ============================================================

create table conversations (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references users(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index conversations_user_id_idx on conversations(user_id);

-- ============================================================
-- readings
-- 1回の鑑定記録(カード・応答・コスト)
-- ============================================================

create table readings (
  id                   uuid           primary key default uuid_generate_v4(),
  conversation_id      uuid           not null references conversations(id) on delete cascade,
  -- user_id は RLS と集計クエリのために非正規化
  user_id              uuid           not null references users(id) on delete cascade,
  question             text           not null,
  question_context     question_context,
  spread_type          spread_type    not null default 'single',
  -- [{card_id, slug, orientation, position}] の配列
  cards                jsonb          not null default '[]',
  response_text        text           not null,
  crisis_level         crisis_level   not null default 'none',
  is_premium           boolean        not null default false,
  -- API コスト追跡
  input_tokens         integer,
  output_tokens        integer,
  cache_read_tokens    integer,
  cache_creation_tokens integer,
  created_at           timestamptz    not null default now()
);

create index readings_user_id_idx           on readings(user_id);
create index readings_conversation_id_idx   on readings(conversation_id);
create index readings_created_at_idx        on readings(created_at desc);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on users
  for each row execute function update_updated_at();

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at();

-- ============================================================
-- Row Level Security
-- サーバーサイドはサービスロールキーを使用するため RLS をバイパスする。
-- anon / authenticated ロールからの直接アクセスを遮断する(多層防御)。
-- LIFF から直接 Supabase を叩く場合はユーザーロールのポリシーを追加すること。
-- ============================================================

alter table users         enable row level security;
alter table subscriptions enable row level security;
alter table conversations enable row level security;
alter table readings      enable row level security;

-- 現時点ではポリシーなし = サービスロール以外のアクセスをすべて拒否
