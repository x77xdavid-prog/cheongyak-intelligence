# 이메일 알림 시스템 셋업 (사용자 작업 — 총 15~20분)

코드는 전부 배포돼 있고, 아래 계정 3가지만 연결하면 알림이 실제로 발송됩니다.
**하나도 안 해도 사이트는 정상 동작** — 구독 폼은 "오픈 준비 중"으로, cron은 데이터 갱신만 합니다.

## 시스템 구조

```
매일 09:00 KST (GitHub Actions cron)
  ① scripts/fetch-bunyang.mjs  청약홈 수집 → bunyang.js 갱신 커밋 (Pages 재배포)
  ② scripts/notify.mjs         Supabase 구독자 × 오늘 데이터 매칭 → Brevo 발송
                               (sent_log로 같은 소식 재발송 방지, unsubs 제외)
```

## 1단계 — Supabase (구독자 저장소, 무료)

1. https://supabase.com 가입 → New Project (이미 modu-card에서 쓰는 계정 그대로)
2. SQL Editor에서 아래 실행:

```sql
create table public.subscribers (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and length(email) <= 254),
  region text not null default '' check (length(region) <= 20),
  topics text not null default '' check (length(topics) <= 100)
);
alter table public.subscribers enable row level security;
create policy "public can subscribe" on public.subscribers
  for insert to anon with check (true);

create table public.unsubs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and length(email) <= 254)
);
alter table public.unsubs enable row level security;
create policy "public can unsubscribe" on public.unsubs
  for insert to anon with check (true);

create table public.sent_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null,
  item_key text not null,
  topic text not null,
  unique (email, item_key, topic)
);
alter table public.sent_log enable row level security;
-- sent_log는 anon 정책 없음 = 브라우저에서 접근 불가, cron(service key)만 사용
```

> 보안: anon 키는 **insert만** 가능(RLS). 구독자 이메일 목록은 브라우저에서 절대 조회 불가.

3. Settings → API에서 두 값 복사:
   - Project URL → `alerts-config.js`의 `SUPABASE_URL`
   - anon public key → `alerts-config.js`의 `SUPABASE_ANON_KEY`
   - **service_role key → GitHub 시크릿용으로 따로 보관 (코드에 절대 넣지 말 것)**

4. [alerts-config.js](alerts-config.js) 두 값 채워서 commit/push → 구독 폼 즉시 활성화.

## 2단계 — Brevo (메일 발송, 무료 300통/일)

1. https://www.brevo.com 가입
2. Senders에서 발신 이메일 인증 (본인 Gmail 가능, 도메인 불필요)
3. Settings → SMTP & API → **API Keys** → 새 키 생성 복사

## 3단계 — GitHub 시크릿 (발송 활성화)

repo → Settings → Secrets and variables → Actions → New repository secret, 4개:

| 이름 | 값 |
|------|-----|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key |
| `BREVO_API_KEY` | Brevo API 키 |
| `FROM_EMAIL` | Brevo에서 인증한 발신 이메일 |

## 4단계 — 테스트

1. Actions 탭 → daily-alerts → **Run workflow** (수동 실행)
2. 로그 확인: `구독자 N명` → `발송 → ...`
3. 본인 이메일로 사이트에서 구독 → 다시 Run workflow → 메일 수신 확인

## 로컬 테스트 (개발용)

```bash
# 발송 없이 매칭 결과만 출력 (계정 불필요)
DRY=1 SUBSCRIBERS_JSON='[{"email":"me@test.com","region":"","topics":"new,soon,under","created_at":"2026-01-01"}]' node scripts/notify.mjs

# 데이터 수집만
node scripts/fetch-bunyang.mjs
```

## 운영 한도 (전부 무료 티어)

| 항목 | 한도 | 초과 시 |
|------|------|---------|
| Brevo 발송 | 300통/일 | 구독자 300명 넘으면 유료(월 $9~) 또는 발송 분할 |
| Supabase | 500MB DB | 구독자 수백만 명까지 여유 |
| GitHub Actions | public repo 무제한 | — |

## 알림 종류별 데이터 근거 (정직성)

| 토픽 | 근거 | 상태 |
|------|------|------|
| 신규 분양 공고 | 청약홈 APT 리스트 모집공고일 | ✅ 완전 |
| 마감 임박 D-7 | 청약기간 마감일 계산 | ✅ 완전 |
| 특별공급 공고 | 특별공급신청현황="신청현황" (온라인 특공 접수 있는 공고) | ✅ 공고 단위 (자격유형별 세분화는 v2) |
| 미달·무순위(줍줍) | 청약홈 무순위 리스트 (무순위(사후)·임의공급 등) | ✅ 무순위 공고 = 줍줍 그 자체 |
