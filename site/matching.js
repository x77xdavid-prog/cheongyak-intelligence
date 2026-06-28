/* 매칭 엔진 — 디자인/DOM 무관 순수 로직. 브라우저(window.MATCH) + 노드(module.exports) 공용.
   지역 커트라인은 휴리스틱 "참고치"이며, enrich된 실제 경쟁률/당첨가점으로 점차 정밀화 예정. */
(function (root) {
  // 완성 연수를 날짜 구성요소로 정확히 계산(365.25 근사 경계 오류 방지)
  function elapsed(from, now) {
    let cy = now.getFullYear() - from.getFullYear();
    const anniv = new Date(from); anniv.setFullYear(now.getFullYear());
    if (now < anniv) cy--;                       // 올해 기념일 전이면 1년 덜
    return { cy, raw: (now - from) / (365.25 * 864e5) };
  }
  const housePts = cy => Math.min(32, 2 + 2 * cy);                 // 무주택 1년미만2, +2/완성년, 15년+32
  const bankPts = (cy, raw) => (raw < 0.5 ? 1 : cy < 1 ? 2 : Math.min(17, 2 + cy)); // <6개월1, <1년2, +1/완성년
  const famPts = n => Math.min(35, 5 + 5 * n);

  function computeGajeom(bb, now) {
    bb = bb || {}; now = now || new Date();
    let g1 = 0, g3 = 0;
    if (bb["i-birth"] && !bb["i-own"]) {
      const b30 = new Date(bb["i-birth"]); b30.setFullYear(b30.getFullYear() + 30);
      let base = b30;
      if (bb["i-marry"]) { const m = new Date(bb["i-marry"]); if (m > base) base = m; }
      if (base < now) g1 = housePts(elapsed(base, now).cy);
    }
    if (bb["i-join"]) { const e = elapsed(new Date(bb["i-join"]), now); if (e.raw >= 0) g3 = bankPts(e.cy, e.raw); }
    const g2 = famPts(+bb["i-fam"] || 0);
    return { g1, g2, g3, total: g1 + g2 + g3 };
  }

  // 지역별 가점 커트라인 휴리스틱(참고치) — 실제는 단지·평형별 상이
  const CUTOFF = { 서울: 62, 세종: 58, 경기: 54, 인천: 52, 부산: 50, 대전: 50, 대구: 48, 울산: 46, 광주: 46, 제주: 48 };
  const expectedCutoff = region => CUTOFF[region] ?? 42;

  function gajeomOutlook(score, region) {
    const diff = (score || 0) - expectedCutoff(region);
    if (diff >= 2) return { label: "가점 유망", tone: "hi", add: 30 };
    if (diff >= -6) return { label: "가점 경합", tone: "mid", add: 20 };
    return { label: "추첨·특공 노려야", tone: "lo", add: 8 };
  }

  // item: bunyang item, prefs: {regions[],htype,special[]}, gajeom: number
  function fit(item, prefs, gajeom) {
    prefs = prefs || {};
    const regs = prefs.regions || [];
    if (regs.length && !regs.includes(item.지역)) return { score: 0, band: "lo", reasons: ["희망지역 아님"], outlook: null, excluded: true };
    let s = 40; const reasons = [];
    if (regs.length) reasons.push("희망지역 ✓");
    if (!prefs.htype || prefs.htype === "무관" || prefs.htype === item.주택구분) { s += 15; }
    else reasons.push(item.주택구분 + "(희망 외)");
    const ol = gajeomOutlook(gajeom, item.지역); s += ol.add; reasons.push(ol.label);
    if (prefs.special && prefs.special.length) { s += 15; reasons.push("특공 가능"); }
    s = Math.min(100, s);
    return { score: s, band: s >= 70 ? "hi" : s >= 45 ? "mid" : "lo", reasons, outlook: ol, excluded: false };
  }

  const API = { computeGajeom, expectedCutoff, gajeomOutlook, fit };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.MATCH = API;
})(typeof window !== "undefined" ? window : globalThis);

/* ---- 노드 셀프체크: node matching.js ---- */
if (typeof require !== "undefined" && require.main === module) {
  const A = module.exports, assert = require("assert");
  // 가점: 무주택 만30세+10년 가정, 가입 8년, 부양 2명
  const now = new Date("2026-06-25");
  const g = A.computeGajeom({ "i-birth": "1986-06-25", "i-join": "2018-06-25", "i-fam": 2 }, now);
  // 무주택 만10년→22, 가입 8년→10, 부양2명→15 = 47
  assert(g.g1 === 22 && g.g3 === 10 && g.g2 === 15 && g.total === 47, "가점 계산 오류: " + JSON.stringify(g));
  // 유주택이면 무주택 0
  assert(A.computeGajeom({ "i-birth": "1986-06-25", "i-own": true }, now).g1 === 0, "유주택 처리 오류");
  // fit: 희망지역 아니면 제외
  assert(A.fit({ 지역: "부산", 주택구분: "민영" }, { regions: ["서울"] }, 60).excluded, "지역 제외 오류");
  // fit: 서울 고가점 → hi
  const f = A.fit({ 지역: "지방", 주택구분: "민영" }, { regions: [], special: ["생애최초"] }, 70);
  assert(f.score >= 70 && f.band === "hi", "fit 점수 오류: " + JSON.stringify(f));
  console.log("[OK] matching.js self-check passed", JSON.stringify(g));
}
