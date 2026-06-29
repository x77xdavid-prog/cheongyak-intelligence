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

  /* ---------------------------------------------------------------------------
     추천 엔진 — "당신에게 맞는 현장" + (매칭 없으면) 특공/공공분양 폴백.
     꼭 청약 받게 하려고 항상 '신청 가능한 한 가지'를 돌려준다. 모두 순수 로직. */

  // 청약기간 "YYYY-MM-DD ~ YYYY-MM-DD" → {key,dday,start,end}. status()와 동일 규칙.
  function parseApply(item, now) {
    now = now || new Date();
    const m = String((item && item.청약기간) || "").match(/\d{4}-\d{2}-\d{2}/g);
    if (!m || !m.length) return { key: "wait", dday: null, start: null, end: null };
    const st = new Date(m[0]); st.setHours(0, 0, 0, 0);
    const en = m[1] ? new Date(m[1]) : new Date(m[0]); en.setHours(0, 0, 0, 0);
    const t = new Date(now); t.setHours(0, 0, 0, 0);
    const dd = Math.round((st - t) / 864e5), ddE = Math.round((en - t) / 864e5);
    if (dd > 0) return { key: dd <= 7 ? "soon" : "wait", dday: dd, start: st, end: en };
    if (ddE >= 0) return { key: "live", dday: 0, start: st, end: en };
    return { key: "done", dday: ddE, start: st, end: en };
  }
  const isUpcoming = ap => !!ap && ap.dday != null && (ap.key === "soon" || ap.key === "wait" || ap.key === "live");

  // 실제 당첨가점 — 평형 중 가장 낮은 '가점최저'(당첨 진입선). enrich 안 된 현장은 null.
  function realCutoff(item) {
    const c = item && item.경쟁률;
    if (!c || !c.rows || !c.rows.length) return null;
    const mins = [];
    c.rows.forEach(r => { const v = parseInt(String(r.가점최저 || "").replace(/[^0-9]/g, ""), 10); if (v > 0) mins.push(v); });
    return mins.length ? Math.min.apply(null, mins) : null;
  }
  const rateOf = item => { const s = item && item.경쟁률 && item.경쟁률.summary; return s ? (s.종합경쟁률 == null ? null : s.종합경쟁률) : null; };

  // 소득구간(low ≤130% / mid 130~160% / high >160% / unknown) → 특공 공급단계
  function incomeStep(income) {
    switch (income) {
      case "low": return { step: "우선공급", note: "소득 130% 이하 → 우선공급(50%) 대상" };
      case "mid": return { step: "일반공급", note: "소득 130~160% → 일반공급(20%) 대상" };
      case "high": return { step: "추첨", note: "소득 160% 초과 → 추첨(부동산 자산 3.31억 이하면 가능)" };
      default: return { step: "소득확인", note: "소득구간을 입력하면 우선/일반/추첨 단계를 안내" };
    }
  }

  // 자격 신호 → 신청 가능한 특별공급 레인. 강도순(저가점일수록 특공이 핵심).
  function specialLanes(p) {
    p = p || {};
    const inc = incomeStep(p.income), L = [];
    if (p.childStatus === "newborn")
      L.push({ key: "newborn", strength: 5, status: "eligible", step: inc.step, income: inc.note,
        reason: "임신·2세 미만 자녀 → 신생아 특공(자격 모집단이 작아 경쟁 분산)" });
    if (p.everOwned === false && (p.marryWithin7 || p.married || p.childStatus !== "none"))
      L.push({ key: "first", strength: 5, status: "eligible", step: inc.step, income: inc.note,
        reason: "평생 무주택 → 생애최초 특공은 가점이 0이어도 추첨으로 당첨 가능(최강 우회)" });
    if (p.childStatus === "multi")
      L.push({ key: "multichild", strength: 4, status: "eligible", step: "배점제", income: "소득기준은 단지 공고 확인",
        reason: "미성년 자녀 2명 이상 → 다자녀 특공(자녀수 배점이 클수록 유리)" });
    if (p.marryWithin7)
      L.push({ key: "newlywed", strength: 3, status: "eligible", step: inc.step, income: inc.note + " (신혼은 100/120% 기준)",
        reason: "혼인 7년 이내 → 신혼부부 특공(소득구분→자녀수→추첨)" });
    if ((+p.fam || 0) > 0)
      L.push({ key: "oldparent", strength: 2, status: "maybe", step: "가점제", income: "",
        reason: "직계존속 부양 중이면 노부모부양 특공 가능(만 65세+ 직계존속 3년 이상 등재 확인)" });
    L.sort((a, b) => ((b.status === "eligible") - (a.status === "eligible")) || (b.strength - a.strength));
    return L;
  }

  // profile: {gajeom, hasInput, region, own, everOwned, married, marryWithin7, childStatus, income, fam}
  // 반환: 행동지향 단일 추천. primary.item 은 항상 채우려 노력(없으면 null + 메시지).
  function recommend(p, items, now) {
    p = p || {}; now = now || new Date(); items = items || [];
    const region = p.region || "", g = p.gajeom || 0;
    const pool = items.map(it => ({ it, ap: parseApply(it, now), cut: realCutoff(it), rv: rateOf(it) }));
    const inReg = x => !region || x.it.지역 === region;
    const upAll = pool.filter(x => isUpcoming(x.ap));
    const upReg = upAll.filter(inReg);
    const byDday = (a, b) => a.ap.dday - b.ap.dday;

    const winnable = upReg.filter(x => x.cut != null && g >= x.cut);     // 실측 당첨가점 이내
    const underdog = upReg.filter(x => x.rv != null && x.rv < 1);        // 경쟁률 미달 = 기회
    const ol = gajeomOutlook(g, region);
    const generalStrong = winnable.length > 0 || (p.hasInput && ol.tone === "hi");

    const generalPick =
      winnable.slice().sort(byDday)[0] || underdog.slice().sort(byDday)[0] || upReg.slice().sort(byDday)[0] || null;
    const isPublic = x => x.it.주택구분 === "국민" && /분양/.test(x.it.분양임대 || "");  // 국민주택 = 공공분양
    const publicPick = upReg.filter(isPublic).sort(byDday)[0] || upAll.filter(isPublic).sort(byDday)[0] || null;
    const anyUp = upReg.slice().sort(byDday)[0] || upAll.slice().sort(byDday)[0] || null;

    const lanes = specialLanes(p);
    const eligible = lanes.filter(l => l.status === "eligible");

    let track, primary;
    if (generalStrong && generalPick) {
      const win = winnable.indexOf(generalPick) >= 0;
      track = "general";
      primary = { kind: win ? "winnable" : "general", item: generalPick.it, ap: generalPick.ap,
        why: [ol.label, win ? "실제 당첨가점 ≤ 내 가점 — 당첨권" : "희망지역 가점 유망"] };
    } else if (eligible.length) {
      track = "special";
      primary = { kind: "special", lane: eligible[0], item: anyUp ? anyUp.it : null, ap: anyUp ? anyUp.ap : null,
        why: [eligible[0].reason] };
    } else if (underdog.length) {
      const u = underdog.slice().sort(byDday)[0];
      track = "general";
      primary = { kind: "underdog", item: u.it, ap: u.ap, why: ["경쟁률 미달 — 가점이 낮아도 노려볼 기회"] };
    } else {
      const pk = publicPick || anyUp;
      track = "public";
      primary = { kind: "public", item: pk ? pk.it : null, ap: pk ? pk.ap : null,
        why: ["공공분양(국민주택)은 가점이 아니라 납입·소득 기준 — 무주택 저가점에 유리"] };
    }
    return { track, primary, lanes, eligible: eligible.length,
      generalPick: generalPick ? generalPick.it : null,
      publicPick: publicPick ? publicPick.it : null,
      winnable: winnable.length, underdog: underdog.length,
      outlook: ol, gajeom: g, hasInput: !!p.hasInput, region };
  }

  const API = { computeGajeom, expectedCutoff, gajeomOutlook, fit, parseApply, realCutoff, incomeStep, specialLanes, recommend };
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

  // --- 추천 엔진 ---
  const items = [
    { 지역: "서울", 주택구분: "민영", 분양임대: "분양주택", 주택명: "서울 고가점 단지", 청약기간: "2026-07-05 ~ 2026-07-07",
      경쟁률: { summary: { 종합경쟁률: 20 }, rows: [{ 가점최저: "69" }] } },
    { 지역: "서울", 주택구분: "국민", 분양임대: "분양주택", 주택명: "서울 공공분양 국민주택", 청약기간: "2026-07-02 ~ 2026-07-03", 경쟁률: null },
    { 지역: "경기", 주택구분: "민영", 분양임대: "분양주택", 주택명: "경기 미달 단지", 청약기간: "2026-07-04 ~ 2026-07-06",
      경쟁률: { summary: { 종합경쟁률: 0.4, 미달: true }, rows: [{ 가점최저: "-" }] } }
  ];
  // 저가점(35)·서울·평생무주택·혼인7년내 → 일반 어려움 → 특공(생애최초/신혼) 트랙
  const rLow = A.recommend({ gajeom: 35, hasInput: true, region: "서울", everOwned: false, married: true, marryWithin7: true, childStatus: "none", income: "low", fam: 0 }, items, now);
  assert(rLow.track === "special" && rLow.primary.lane, "저가점 특공 폴백 실패: " + JSON.stringify(rLow.track));
  assert(rLow.primary.lane.key === "first" || rLow.primary.lane.key === "newlywed", "특공 레인 선정 오류: " + JSON.stringify(rLow.primary.lane));
  assert(rLow.publicPick && rLow.publicPick.주택구분 === "국민", "공공분양 픽 실패");
  // 고가점(72)·서울 → 실제 당첨가점(69) 이내 → 일반 당첨권
  const rHi = A.recommend({ gajeom: 72, hasInput: true, region: "서울", everOwned: true, childStatus: "none", income: "high", fam: 0 }, items, now);
  assert(rHi.track === "general" && rHi.primary.kind === "winnable", "고가점 당첨권 판정 오류: " + JSON.stringify(rHi.primary));
  // 신생아 신호 → 신생아 레인 최우선
  const lanes = A.specialLanes({ childStatus: "newborn", everOwned: false, marryWithin7: true, income: "low", fam: 1 });
  assert(lanes[0].key === "newborn", "신생아 우선순위 오류: " + JSON.stringify(lanes.map(l => l.key)));
  // 신호 전혀 없음(자격 미상) → 특공 없음 → 공공/미달 폴백이라도 신청 경로 제공
  const rNone = A.recommend({ gajeom: 30, hasInput: true, region: "경기", everOwned: true, childStatus: "none", income: "unknown", fam: 0 }, items, now);
  assert(rNone.primary.item, "항상 신청 경로 제공 실패(폴백 없음)");

  console.log("[OK] matching.js self-check passed", JSON.stringify(g), "| reco low→", rLow.track, rLow.primary.lane && rLow.primary.lane.key, "| hi→", rHi.primary.kind);
}
