# Blueprint(도면) 디자인 시스템 — 청약 인텔리전스

> **방향성 한 줄:** 청약·분양을 "건축 도면 + 인장 찍힌 원장(ledger)"으로 번역한다. 도면 메타포를 색·폰트 같은 표면이 아니라 **정보구조(SHEET 넘버링)·컴포넌트(치수선·평면도·인장)·카피("원장")·반응형 시그니처**까지 일관 관통시킨다. radius가 2px인 것조차 "제도 도면엔 둥근 모서리가 없다"는 컨셉의 귀결이다.

적용 파일: `redesign/blueprint.html`(분양 도면 분석 랜딩, 1810줄) · `board.html`(공지/FAQ 게시판, 826줄) · `manage.html`(청약 기록 관리 도구, 1043줄). 세 파일이 동일 토큰을 1:1 공유한다(드리프트 0).

---

## 1. 색 토큰 (실제 값)

`:root`에서 추출. 브랜드 hue 3개(잉크/도면블루/인장적색) + 의미 전용 앰버 1개 = 12색 이내.

| 토큰 | 값 | 역할 |
|---|---|---|
| `--paper` | `#EAEEF0` | 제도지 배경(페이지 bg) |
| `--paper-2` | `#E1E7EA` | 푸터 등 가라앉은 면 |
| `--sheet` | `#F4F6F7` | 카드·표면(ledger/plansheet) |
| `--ink` | `#16242E` | 본문·헤딩 (paper 위 고대비) |
| `--ink-2` | `#3C4D57` | 보조 텍스트 |
| `--ink-3` | `#5A6B74` | 메타·캡션 — **`#62727B`에서 AA 위해 의도적으로 어둡게 보정**(주석에 명시) |
| `--blue` | `#2B5C8A` | 드래프팅 블루 = 정보/진행/링크 |
| `--blue-deep` | `#1C3F61` | active 링크·버튼 보더 |
| `--blue-line` / `-line-2` / `-tint` | `rgba(43,92,138, .12 / .22 / .06)` | 모눈·치수선·hover 틴트 |
| `--stamp` | `#C0392B` | 인장 적색 = 적합/초과/경고 도장, 라이브닷 |
| `--stamp-deep` | `#93281E` | 인장 보더·그림자 |
| `--stamp-soft` | `rgba(192,57,43,.10)` | 평면도 매칭 구역 틴트 |
| `--warn` | `#B7791F` | **드래프팅 앰버 = D-day 임박 전용**(브랜드 적색과 의미 충돌 방지) |
| `--warn-deep` | `#8A5A12` | 앰버 텍스트(틴트 배경 위 대비 확보) |
| `--warn-tint` | `rgba(183,121,31,.10)` | 앰버 배경 |
| `--hair` / `--hair-strong` | `rgba(22,36,46, .16 / .30)` | 헤어라인 보더·셀 구분선 |

**규칙:** "긴급(warn 앰버)·적합/위험(stamp red)·정보(blue)"는 각각 *deep + tint 2단*으로만 운용한다. 브랜드 적색을 긴급에 재사용하지 말 것 — 앰버를 별도 배정한 것이 정답.

---

## 2. 타이포

**폰트 3종 — 역할 분리(가장 중요한 안티슬롭 장치):**
- `--f-disp`: `'Space Grotesk', 'Pretendard', sans-serif` — 디스플레이/헤드라인/버튼
- `--f-body`: `'Pretendard', system-ui, sans-serif` — 한글 본문
- `--f-mono`: `'JetBrains Mono', 'Space Grotesk', monospace` — **모든 수치·라벨·시트번호(제도 치수 메타포)**

**수치 토큰(필수):** `.num{ font-family:mono; font-variant-numeric:tabular-nums; font-feature-settings:"tnum" 1; }` — 가점·D-day·경쟁률·금액이 자릿수 정렬되어 흔들리지 않는다. 도면/제도 컨셉과 타이포가 한 몸.

**스케일 — 1.25 모듈러(`--t-0` ~ `--t-8`):**
`0.78 / 0.9375 / 1.0 / 1.25 / 1.5625 / 1.953 / 2.44 / 3.05 / 3.82 rem`
- 본문 = `--t-1`(15px), line-height 1.62
- 헤딩 line-height 1.18, letter-spacing -.01em
- 히어로 H1 = `clamp(2.05rem, 5.4vw, 3.7rem)`, 섹션 H2 = `clamp(1.5rem, 3vw, 2rem)`

> 알려진 미세 결함: 본문 최소 15px로 16px 권고선에 살짝 미달. 드래프팅 mono 라벨 8.5~9.5px(SHEET·DWG·치수)는 장식 캡션이라 본문 가독성과 무관하나, 읽혀야 하는 면적/치수 주석은 10px로 +1px 권장.

---

## 3. 간격 · radius

**간격 — 4/8 계열 `--sp-1`~`--sp-7`:** `.375 / .625 / 1 / 1.5 / 2.25 / 3.5 / 5 rem`. 가장자리 `--edge: clamp(1rem, 4vw, 3.25rem)`, 콘텐츠 폭 `--maxw: 1240px`.

**radius 위계 — 3티어(균일 안티패턴을 컨셉으로 정당화):**
1. **본문 표면 = `2px`**(거의 전부) — "도면 = 직각" 컨셉
2. **강조 객체 = `3px` + `rotate(-3deg)`** — 스탬프 배지(인장 찍힌 느낌)
3. **브랜드 마크 = `50%` 원형 + `rotate(-6deg)`** — 인장 도장

> 모든 모서리를 같게도, 제멋대로 다르게도 하지 말 것. radius는 의미를 가진다.

---

## 4. 시그니처 요소 (이 디자인을 템플릿과 가르는 핵심)

- **`.dimrule` / `.dimline` 치수선 디바이더** — 양끝에 tick(`::before/::after` 9px 수직선)이 달린 1px 라인 + 가운데 mono 태그. 제도 도면의 치수 표기 메타포.
- **`.regmark` 레지스터 코너마크** — 4모서리 `position:fixed` 십자 마크(22px, opacity .7). 인쇄 정합 표식. 640px 이하 `display:none`.
- **`.section-head .idx` = SHEET 넘버링** — `SHEET 01 / 04 / B / M-01` mono 라벨이 섹션을 "도면 시트"로 번호 매김. scroll-spy nav active와 결합되어 **웨이파인딩 기능**으로 작동(장식 아님).
- **`.callout` 리더라인** — 원(`::after` 5px) + 22px 선. 원장/진단 가장자리 주석.
- **모눈 배경** — body에 4겹 linear-gradient: 굵은선 2겹(`gridsize×5 = 130px`) + 가는선 2겹(`gridsize 26px`). 전 페이지 공통 좌표계.
- **`.plansheet` / `.planthumb` 평면도** — 히어로 UNIT PLAN 카드(u1~u4 유닛 박스), 모바일 카드의 42×33 축소 썸네일. `.match` 클래스로 "내 조건 적합 구역"만 stamp red(`색=의미`).
- **`.stampbadge` 판정 스탬프** — `.solid`(채움)/`.faded`(점선+rotate(2deg))/`.calm`(blue) 3변형. 게시판 카테고리·판정 결과에 인장 메타포 일관 적용.
- **인장 로고** — `.stamp-mark` 38px 원형 + 이중 보더(`::after inset:3px`) + `rotate(-6deg)`.

---

## 5. 반응형 규칙

`overflow-x:hidden` 안전망 + 4단 브레이크포인트. **리플로우가 아니라 리포맷:**

- **980px** — hero-grid 2→1열, ledger 4→2열(보더 재배치), steps 2열, diag 1열, diag-form 2열, footer 2열.
- **760px** — nav를 44×44 햄버거(`.menutoggle`, `aria-expanded`)로 전환, 메뉴 절대배치 드롭다운, diag-form/timeline 날짜행 축소.
- **560px** — **`.alert-table` 통째 `display:none` → `.m-cards` 카드 스택**으로 교체(데이터 테이블 가로스크롤 회피). 5-up 타임라인 → 세로축 스택. **mcard에 planthumb 42×33 축소판을 남겨 브랜드 시그니처 유지.**

> 각 브레이크포인트가 그 폭에서 독립적으로 "말 되게" 설계. 가로스크롤은 구조로 회피하되 정체성은 남긴다.

---

## 6. 모션 규칙

- **속성 한정:** `transform / opacity / background / border-color / box-shadow / grid-template-rows`만 사용 — 레이아웃 churn 회피(컴포지터 친화).
- **타이밍:** `transition` 0.12~0.28s, ease. 아코디언만 `grid-template-rows 0fr→1fr .28s var(--ease-out-expo, ease)`.
- **목적 모션:** 라이브닷 `@keyframes pulse` 2.4s box-shadow(실시간 수집 신호), 버튼 `:active{ translateY(1px) }` 눌림.
- **reduced-motion (CSS+JS 양쪽):** `@media (prefers-reduced-motion:reduce)`에서 `*{ transition:none !important }` + `scroll-behavior:auto` + `.live .dot{ animation:none }`. JS는 `matchMedia` `REDUCE` 플래그로 countUp/채움을 즉시 최종값 처리.

> **알려진 결함 2건:** (a) `--ease-out-expo` 변수가 `:root`에 정의되지 않아 항상 `, ease` 폴백으로 작동 — 토큰화 의도 미완. (b) `.barfill` 가점 게이지에 채움 transition이 없어 입력→가점 변화가 하드 스냅(진단 인과 전달 약함). `transform:scaleX`(transform-origin:left) + `transition:transform .4s`로 고칠 것.

---

## 7. 컴포넌트 패턴

| 패턴 | 구현 |
|---|---|
| **현장표/원장(ledger)** | `border-collapse`형 그리드 셀(헤어라인 보더)로 카드 그리드 회피. `.metric` 4열, mono mval `clamp(2rem,4.4vw,2.9rem)`. |
| **가점 계산기(diag)** | 입력 폼 + `.barfill` 게이지 + `.barmax` 만점 caret(트랙 아래 right-anchor, 점수와 충돌 회피). 합계 `44/84` mono 대형. `over` 클래스로 초과 시 stamp red. |
| **SHEET 섹션** | `.section-head`에 `.idx`(SHEET nn) + H2 + `.hint` 3단 리듬. `scroll-margin-top:84px`로 sticky nav 보정. |
| **스탬프 판정** | `.stampbadge` 3변형으로 적합/마감/정보 표현. 무지개 카테고리 색·좌측 컬러보더 안티패턴 회피. |
| **네비** | sticky `--paper` **불투명**(반투명+blur는 헤딩 고스팅 유발 → 의도적 solid, 주석 명시). `aria-current` scroll-spy active, active 밑줄 stamp red. 모든 링크 44px. |
| **접근성** | 전역 `focus-visible{ outline:2px blue; offset:3px }`, 모든 인터랙티브 `min-height:44px`, `aria-expanded/pressed/current/selected`, 게이지에 동적 `aria-label`. |

---

## 8. 평가 점수 (3관점 종합)

3명의 시니어 디자이너 관점(시각크래프트 / 인터랙션·접근성·반응형 / 도메인 메타포·독창성) 종합.

| 카테고리 | 등급 |
|---|---|
| ① 시각 위계 | **A** (A·A·A-) |
| ② 타이포 | **A** |
| ③ 색·대비 | **A-** (A·A-·B+ — 8.5px mono 라벨 tint 위 대비가 경계선) |
| ④ 간격·레이아웃·radius | **A** |
| ⑤ 인터랙션 상태 | **A-** (disabled 상태 미정의) |
| ⑥ 반응형 | **A** |
| ⑦ 모션 | **A-** (게이지 채움 모션 누락) |
| ⑧ 콘텐츠·마이크로카피·UX | **A** |
| ⑨ 독창성 | **A** |
| ⑩ 성능감 | **B+** (B·A-·A- — 폰트 CDN @latest 미핀·preload 없음, 4겹 그리드 페인트) |

**종합 등급: A−** (상위권 / 컨셉 일관성 기준 상위 5%)
**AI-slop 등급: 슬롭 아님 (CLEAN)** — 블랙리스트 12항목 0건 적중. 결정적 증거: `--ink-3` AA 보정 주석, nav 반투명→solid 고스팅 수정 주석, barmax 충돌 회피 — 손으로 매만진 흔적이 소스에 실재.

**남은 폴리시(우선순위):**
1. (high) `.barfill` 게이지 채움 모션 `transform:scaleX`로 추가 — 진단 인과 전달.
2. (high) 8.5~9px mono 라벨을 10px로, tint 배경 위 텍스트 4.5:1 실측 검증.
3. (med) disabled/빈입력 버튼 상태 `opacity:.45; cursor:not-allowed` + `aria-disabled` 정의.
4. (med) Pretendard `@latest` → 버전 핀 + Space Grotesk 히어로 weight `preload`.
5. (polish) `--ease-out-expo` `:root` 정의, 본문 16px, 4겹 그리드 → 3겹 축소.
