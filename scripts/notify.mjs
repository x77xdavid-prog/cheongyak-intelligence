#!/usr/bin/env node
/**
 * 청약 알림 발송 엔진 — 구독자 조건 매칭 → Brevo 이메일 발송
 *
 * 흐름:
 *  1) Supabase에서 구독자·수신거부·발송이력 조회 (service key)
 *  2) bunyang.js(APT) + data/remndr.json(무순위)에서 오늘 보낼 소식 매칭
 *     - new     신규 분양 공고 (모집공고일 최근 2일)
 *     - special 특별공급 공고 (신규 중 특공 온라인 접수 있는 것)
 *     - soon    마감 임박 (청약 접수 마감 D-7 이내)
 *     - under   미달·무순위(줍줍) (무순위 신규 공고, 최근 2일)
 *  3) 구독자별 다이제스트 1통 발송 (Brevo), sent_log로 항목 단위 중복 방지
 *
 * 환경변수: SUPABASE_URL, SUPABASE_SERVICE_KEY, BREVO_API_KEY, FROM_EMAIL
 *   선택:   SITE_URL, DRY=1(발송 없이 출력), SUBSCRIBERS_JSON(테스트용 구독자 주입)
 * 시크릿 미설정 시 exit 0 (셋업 전 cron 통과용 가드).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_URL = process.env.SITE_URL || "https://x77xdavid-prog.github.io/cheongyak-intelligence";
const PAGE_URL = `${SITE_URL}/redesign/blueprint.html`;
const DRY = process.env.DRY === "1";
const NEW_WINDOW_DAYS = 2;   // '신규' 판정 창 — sent_log가 항목 단위 중복을 막으므로 넉넉해도 안전
const SOON_DAYS = 7;         // 마감 임박 D-7

const TOPIC_LABEL = {
  new: "신규 분양 공고",
  special: "특별공급 공고",
  soon: "마감 임박 D-7",
  under: "미달·무순위(줍줍)",
};

/* ---------- 날짜 (KST) ----------
   Date 객체 자체는 UTC epoch — ISO 문자열 슬라이스만 KST 벽시계 날짜.
   daysFromToday의 new Date(ymd)도 UTC 자정 해석이라 양쪽이 상쇄되어 날짜 차이는 정확. */
const KST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
function daysFromToday(ymd) {
  if (!ymd) return null;
  return Math.round((new Date(ymd) - new Date(KST)) / 864e5);
}
function periodEnd(청약기간) {
  const m = String(청약기간 || "").match(/\d{4}-\d{2}-\d{2}/g);
  return m ? m[m.length - 1] : null;
}

/* ---------- 데이터 로드 ---------- */
function loadItems() {
  const win = {};
  new Function("window", readFileSync(join(ROOT, "bunyang.js"), "utf-8"))(win);
  const apt = win.BUNYANG?.items || [];
  let rem = [];
  try {
    rem = JSON.parse(readFileSync(join(ROOT, "data", "remndr.json"), "utf-8")).items || [];
  } catch { /* 무순위 파일 없으면 해당 토픽만 건너뜀 */ }
  return { apt, rem };
}

/* ---------- 토픽별 매칭 ---------- */
function buildTopicItems({ apt, rem }) {
  const isRecent = (it) => {
    const d = daysFromToday(it.모집공고일);
    return d !== null && d <= 0 && d >= -NEW_WINDOW_DAYS;
  };
  const newItems = apt.filter(isRecent);
  return {
    new: newItems,
    special: newItems.filter((it) => String(it.특별공급신청현황 || "").includes("신청현황")), // 완화 매칭 — 청약홈 표기 변화에 견딤
    soon: apt.filter((it) => {
      const end = daysFromToday(periodEnd(it.청약기간));
      return end !== null && end >= 0 && end <= SOON_DAYS;
    }),
    under: rem.filter(isRecent),
  };
}

/* ---------- Supabase REST ---------- */
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
async function sb(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

async function loadSubscribers() {
  if (process.env.SUBSCRIBERS_JSON) {
    return { subs: JSON.parse(process.env.SUBSCRIBERS_JSON), sentSet: new Set() };
  }
  const [rows, unsubs, sent] = await Promise.all([
    sb("subscribers?select=email,region,topics,created_at&order=created_at.asc"),
    sb("unsubs?select=email,created_at"),
    sb("sent_log?select=email,item_key,topic"),
  ]);
  // 이메일당 마지막 구독 행이 유효 (재구독 = 새 행)
  const latest = new Map();
  for (const r of rows) latest.set(r.email.toLowerCase(), r);
  // 수신거부: 마지막 구독보다 늦은 unsub이 있으면 제외
  for (const u of unsubs) {
    const s = latest.get(u.email.toLowerCase());
    if (s && u.created_at > s.created_at) latest.delete(u.email.toLowerCase());
  }
  const sentSet = new Set(sent.map((r) => `${r.email.toLowerCase()}|${r.item_key}|${r.topic}`));
  return { subs: [...latest.values()], sentSet };
}

/* ---------- 이메일 HTML ---------- */
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function itemLink(it, topic) {
  if (topic === "under") return "https://www.applyhome.co.kr/ai/aia/selectAPTRemndrLttotPblancListView.do";
  return `https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do?houseManageNo=${encodeURIComponent(it.hmno)}&pblancNo=${encodeURIComponent(it.pbno)}`;
}
function renderEmail(email, sections) {
  const blocks = sections.map(({ topic, items }) => `
    <h3 style="margin:22px 0 8px;font-size:15px;color:#1C3F61;border-left:3px solid #2B5C8A;padding-left:8px">${TOPIC_LABEL[topic]} <span style="color:#5A6B74">· ${items.length}건</span></h3>
    ${items.map((it) => `
      <div style="border:1px solid #d8dee2;background:#F4F6F7;padding:12px 14px;margin-bottom:8px">
        <a href="${itemLink(it, topic)}" style="font-weight:700;color:#16242E;text-decoration:none;font-size:14px">${esc(it.주택명)}</a>
        <div style="font-size:12.5px;color:#3C4D57;margin-top:4px">
          ${esc(it.지역)} · ${esc(it.주택구분 || "")} ${it.시공사 ? "· " + esc(it.시공사) : ""}<br>
          청약 ${esc(it.청약기간 || "-")} · 발표 ${esc(it.당첨자발표 || "-")}
        </div>
      </div>`).join("")}
  `).join("");
  return `
  <div style="max-width:560px;margin:0 auto;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#16242E">
    <div style="border-bottom:2px solid #16242E;padding:14px 0;margin-bottom:6px">
      <span style="font-size:17px;font-weight:800">印 청약 인텔리전스</span>
      <span style="font-size:12px;color:#5A6B74;float:right">${KST} 청약홈 수집 기준</span>
    </div>
    ${blocks}
    <div style="margin-top:20px;padding-top:12px;border-top:1px solid #d8dee2;font-size:11.5px;color:#5A6B74;line-height:1.7">
      본 메일은 청약 인텔리전스 알림 구독자에게 발송되었습니다. 경쟁률·판정은 공개 데이터 기반 추정이며,
      실제 신청·결과는 <a href="https://www.applyhome.co.kr" style="color:#2B5C8A">청약홈</a> 공고를 반드시 확인하세요.<br>
      <a href="${PAGE_URL}" style="color:#2B5C8A">내 가점 진단하기</a> ·
      <a href="${SITE_URL}/unsub.html?e=${encodeURIComponent(email)}" style="color:#5A6B74">수신거부</a>
    </div>
  </div>`;
}

/* ---------- Brevo 발송 ---------- */
async function sendEmail(to, subject, html) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "청약 인텔리전스", email: process.env.FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/* ---------- 메인 ---------- */
async function main() {
  if (!process.env.SUBSCRIBERS_JSON && (!SB_URL || !SB_KEY)) {
    console.log("SUPABASE_URL/SUPABASE_SERVICE_KEY 미설정 — 발송 스킵 (셋업 전 정상)");
    return;
  }
  if (!DRY && (!process.env.BREVO_API_KEY || !process.env.FROM_EMAIL)) {
    console.log("BREVO_API_KEY/FROM_EMAIL 미설정 — 발송 스킵 (셋업 전 정상)");
    return;
  }

  const topicItems = buildTopicItems(loadItems());
  console.log("오늘 매칭 재료:", Object.entries(topicItems).map(([k, v]) => `${k}=${v.length}`).join(" "));

  const { subs, sentSet } = await loadSubscribers();
  console.log(`구독자 ${subs.length}명`);

  let sentCount = 0;
  for (const sub of subs) {
    const email = sub.email.toLowerCase();
    const wants = String(sub.topics || "").split(",").map((s) => s.trim()).filter(Boolean);
    const regionOk = (it) => !sub.region || sub.region === "전국" || it.지역 === sub.region;

    const sections = [];
    const logRows = [];
    for (const topic of wants) {
      const items = (topicItems[topic] || []).filter(regionOk)
        .filter((it) => !sentSet.has(`${email}|${it.pbno}|${topic}`))
        .slice(0, 10); // 폭주 방지 — 메일당 토픽별 최대 10건
      if (!items.length) continue;
      sections.push({ topic, items });
      logRows.push(...items.map((it) => ({ email, item_key: String(it.pbno), topic })));
    }
    if (!sections.length) continue;

    const counts = sections.map((s) => `${TOPIC_LABEL[s.topic]} ${s.items.length}`).join(" · ");
    const subject = `[청약 인텔리전스] ${counts}`;

    if (DRY) {
      console.log(`(DRY) → ${email}: ${subject}`);
      sections.forEach((s) => s.items.forEach((it) => console.log(`    [${s.topic}] ${it.주택명} (${it.지역}, ${it.청약기간})`)));
      continue;
    }
    try {
      await sendEmail(sub.email, subject, renderEmail(sub.email, sections));
    } catch (e) {
      console.error(`발송 실패 (${email}):`, e.message); // 한 명 실패해도 나머지 계속
      continue;
    }
    sentCount++;
    console.log(`발송 → ${email}: ${subject}`);
    // 발송은 이미 성공 — 이력 기록 실패는 별도 경고 (기록 누락 시 다음 실행에 중복 발송 가능)
    if (!process.env.SUBSCRIBERS_JSON) {
      try {
        await sb("sent_log?on_conflict=email,item_key,topic", { method: "POST", body: JSON.stringify(logRows), headers: { Prefer: "return=minimal,resolution=ignore-duplicates" } });
      } catch (e) {
        console.error(`⚠ 발송이력 기록 실패 (${email}) — 다음 실행에서 같은 소식이 중복 발송될 수 있음:`, e.message);
      }
    }
    logRows.forEach((r) => sentSet.add(`${r.email}|${r.item_key}|${r.topic}`));
    await new Promise((r) => setTimeout(r, 300)); // Brevo rate 여유
  }
  console.log(DRY ? "DRY-RUN 종료" : `발송 완료: ${sentCount}통`);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
