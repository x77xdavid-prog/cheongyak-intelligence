/**
 * 알림 구독 설정 — Supabase 프로젝트 생성 후 아래 두 값을 채우면 구독이 실제 저장됩니다.
 * ⚠ 반드시 SETUP-ALERTS.md의 SQL(RLS 정책 포함)을 먼저 실행한 뒤 채울 것.
 *   RLS 없이 키만 채우면 테이블이 공개 조회될 수 있다. (RLS 적용 시 anon key는 insert만 가능 = 공개 안전)
 * 비워두면 구독 폼은 "오픈 준비 중" 안내로 동작합니다.
 */
window.ALERTS_CFG = {
  SUPABASE_URL: "",      // 예: "https://abcdefgh.supabase.co"
  SUPABASE_ANON_KEY: "", // Supabase → Settings → API → anon public key
};
