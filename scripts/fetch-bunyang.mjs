#!/usr/bin/env node
/**
 * 청약홈 분양정보 일일 수집 → bunyang.js 병합 갱신 + data/remndr.json(무순위)
 *
 * 동작:
 *  1) 청약홈 APT 분양 리스트를 페이지 순회 수집 (netFunnel 게이트: 쿠키 2회 요청으로 통과)
 *  2) 기존 bunyang.js 항목과 pbno 기준 병합 — 기존 항목의 enrichment(경쟁률·신청현황)는 보존
 *  3) 무순위(줍줍) 리스트 → data/remndr.json (알림 발송용, 사이트 UI 미사용)
 *
 * 의존성 0 (Node 20+ fetch). GitHub Actions cron에서 매일 실행.
 * ponytail: HTML regex 파싱 — 청약홈 리스트 마크업(data-pbno 행 속성) 변경 시 파서 수정 필요.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://www.applyhome.co.kr/ai/aia";
const LIST_APT = `${BASE}/selectAPTLttotPblancListView.do`;
const LIST_REM = `${BASE}/selectAPTRemndrLttotPblancListView.do`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const MAX_PAGES = 15;          // 페이지당 10건 — 최근분 150건이면 일일 병합에 충분
const CUTOFF_DAYS = 60;        // 모집공고일이 이보다 오래된 페이지에서 순회 중단

/* ---------- KST 날짜 ---------- */
function kstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000);
}
function kstStamp() {
  return kstNow().toISOString().slice(0, 16).replace("T", " ");
}

/* ---------- netFunnel 쿠키 확보 후 fetch ---------- */
let COOKIE = "";
async function gatedFetch(url) {
  const opts = () => ({
    headers: { "User-Agent": UA, ...(COOKIE ? { Cookie: COOKIE } : {}) },
    redirect: "follow",
  });
  let res = await fetch(url, opts());
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (setCookies.length) {
    COOKIE = setCookies.map((c) => c.split(";")[0]).join("; ");
    res = await fetch(url, opts()); // 쿠키 장착 후 재요청 → 실데이터
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

/* ---------- 리스트 HTML 파서 ---------- */
function stripTags(s) {
  return s
    .replace(/<img[^>]*>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
// 리스트별 열 구성이 다름: APT 분양=11열, 무순위=8열
function mapApt(cells, honm) {
  return {
    지역: cells[0], 주택구분: cells[1], 분양임대: cells[2],
    주택명: honm || cells[3], 시공사: cells[4], 문의처: cells[5],
    모집공고일: cells[6], 청약기간: cells[7], 당첨자발표: cells[8],
    특별공급신청현황: cells[9] || null, 경쟁률: null,
  };
}
function mapRemndr(cells, honm) {
  return {
    지역: cells[0], 주택구분: cells[1], // 무순위(사후)·취소후재공급 등
    주택명: honm || cells[2], 시공사: cells[3],
    모집공고일: cells[4], 청약기간: cells[5], 당첨자발표: cells[6],
  };
}
function parseRows(html, mapper, minCells) {
  const items = [];
  const rowRe = /<tr\s+data-pbno="([^"]*)"\s+data-hmno="([^"]*)"[^>]*?data-honm="([^"]*)"[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(html))) {
    const [, pbno, hmno, honm, inner] = m;
    const cells = [...inner.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => stripTags(c[1]));
    if (cells.length < minCells) continue; // 구조 변경 방어
    items.push({ ...mapper(cells, honm.trim()), pbno, hmno });
  }
  return items;
}

async function fetchList(baseUrl, mapper, minCells) {
  const all = [];
  const cutoff = new Date(kstNow().getTime() - CUTOFF_DAYS * 86400000).toISOString().slice(0, 10);
  for (let p = 1; p <= MAX_PAGES; p++) {
    const html = await gatedFetch(`${baseUrl}?pageIndex=${p}`);
    const rows = parseRows(html, mapper, minCells);
    if (!rows.length) break;
    all.push(...rows);
    // 페이지 전체가 컷오프보다 오래됐으면 중단 (리스트는 공고일 내림차순)
    if (rows.every((r) => (r.모집공고일 || "9999") < cutoff)) break;
    await new Promise((r) => setTimeout(r, 700)); // 예의상 간격
  }
  return all;
}

/* ---------- bunyang.js 읽기/병합/쓰기 ---------- */
function loadBunyang(path) {
  const src = readFileSync(path, "utf-8");
  const win = {};
  new Function("window", src)(win);
  if (!win.BUNYANG || !Array.isArray(win.BUNYANG.items)) throw new Error("bunyang.js 파싱 실패");
  return win.BUNYANG;
}

async function main() {
  const bunyangPath = join(ROOT, "bunyang.js");
  const existing = loadBunyang(bunyangPath);
  // pbno = 공고번호(유일키). 기존 데이터 주택명 끝공백 등 표기 편차에 안전.
  const byKey = new Map(existing.items.map((it) => [String(it.pbno), it]));

  console.log(`기존 ${existing.items.length}건 (updated ${existing.updated})`);
  const fetched = await fetchList(LIST_APT, mapApt, 10);
  console.log(`APT 리스트 수집 ${fetched.length}건`);
  if (!fetched.length) throw new Error("수집 0건 — 청약홈 구조 변경 또는 차단 의심, 병합 중단");

  let added = 0;
  for (const it of fetched) {
    const key = String(it.pbno);
    const old = byKey.get(key);
    if (old) {
      // 리스트 필드만 갱신, enrichment(경쟁률 객체·신청현황 상세)는 보존
      Object.assign(old, { ...it, 경쟁률: old.경쟁률, 신청현황: old.신청현황 });
      if (old.신청현황 === undefined) delete old.신청현황;
    } else {
      byKey.set(key, it);
      added++;
    }
  }
  const merged = [...byKey.values()].sort((a, b) => (b.모집공고일 || "").localeCompare(a.모집공고일 || ""));
  const out = { total: merged.length, count: merged.length, updated: kstStamp(), items: merged };
  writeFileSync(bunyangPath, "window.BUNYANG = " + JSON.stringify(out, null, 2) + ";\n", "utf-8");
  // site/(Render 배포 번들)는 자체 사본 사용 — 동기화
  if (existsSync(join(ROOT, "site", "bunyang.js"))) copyFileSync(bunyangPath, join(ROOT, "site", "bunyang.js"));
  console.log(`병합 완료: 신규 ${added}건 → 총 ${merged.length}건`);

  // 무순위(줍줍) — 알림용 별도 JSON (실패해도 본 데이터는 유지)
  try {
    const rem = await fetchList(LIST_REM, mapRemndr, 7);
    mkdirSync(join(ROOT, "data"), { recursive: true });
    writeFileSync(
      join(ROOT, "data", "remndr.json"),
      JSON.stringify({ updated: kstStamp(), items: rem }, null, 2),
      "utf-8"
    );
    console.log(`무순위 수집 ${rem.length}건 → data/remndr.json`);
  } catch (e) {
    console.error("무순위 수집 실패(계속 진행):", e.message);
  }
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
