# 청약홈 수집 자료 인덱스 (insane-search)

## ★ 핵심 산출물 (먼저 보기)
- **[청약-자료집.md](청약-자료집.md)** — 통합 분석본 41,449자. 청약 여정(통장가입→가점→자격/지역→청약중→신청→당첨/완료) + A~G 상세 + 핵심 체크리스트 11개.
- **[sitemap.md](sitemap.md)** — 청약홈 전체 사이트맵 67+ 링크 (7개 대분류, 🔒로그인 게이트 표시).
- **[gated-structure.md](gated-structure.md)** — 로그인 게이트 5종 필드/컬럼 구조(개인정보 값 제외).
- 게시판용 실데이터: 공지 55건 목록 + FAQ 18카테고리 (자료집 G섹션).

---

수집 23건 · 출처 applyhome.co.kr · raw/ + txt/

## A.청약통장
- **청약통장 가입기간별 가입현황** — `txt/bnkb-stat-pd.txt` (3114자) · `/ai/aie/selectSubscrptBnkbSbscrbPdAcctoStusView.do`
- **APT 청약안내 청약통장** — `txt/bnkb-intro.txt` (3080자) · `/ar/ara/selectSubscrptIntroBnkbView.do`
- **청약통장 가입현황** — `txt/bnkb-stat-all.txt` (3040자) · `/ai/aie/selectSubscrptBnkbAllSbscrbStusView.do`
- **청약통장 통장별 가입현황** — `txt/bnkb-stat-acc.txt` (2750자) · `/ai/aie/selectSubscrptBnkbAcctoSbscrbStusView.do`
- **주택청약 상품정보** — `txt/deposit.txt` (1893자) · `/ar/arb/selectsubscriptionDepositInfoView.do`

## B.가점/점수
- **청약가점계산** — `txt/gajeom-calc.txt` (5927자) · `/ap/apg/selectAddpntCalculatorView.do`

## C.자격/지역
- **로그인** — `txt/limit.txt` (5582자) · `/co/cob/selectSubscrptLmttCnList.do`
- **APT 청약안내 청약자격** — `txt/guide-qualf.txt` (3985자) · `/ar/ara/selectSubscrptIntroQualfView.do`
- **규제지역정보** — `txt/special-area.txt` (2033자) · `/ai/aic/selectSpecltSubscrptRndAreaList.do`

## D.청약중현장
- **로그인** — `txt/allimi.txt` (5582자) · `/cu/cuc/selectSubscrptAllimiView.do`
- **APT분양정보** — `txt/apt-list.txt` (4476자) · `/ai/aia/selectAPTLttotPblancListView.do`
- **APT분양정보** — `txt/other-list.txt` (4414자) · `/ai/aia/selectOtherLttotPblancListView.do`
- **APT잔여세대 분양정보/경쟁률** — `txt/remndr-list.txt` (3604자) · `/ai/aia/selectAPTRemndrLttotPblancListView.do`

## E.완료/당첨
- **로그인** — `txt/win-apt.txt` (5582자) · `/wa/waa/selectAptPrzwinDescList.do`
- **입주(예정)정보 조회** — `txt/movein.txt` (3332자) · `/ai/aia/selectAPTMvnPrearngeHsHldcoList.do`

## F.제도안내
- **APT청약안내 특별공급** — `txt/guide-special.txt` (36955자) · `/ar/ara/selectSubscrptIntroSpetialView.do`
- **APT청약안내 당첨자선정** — `txt/guide-preawner.txt` (6249자) · `/ar/ara/selectSubscrptIntroPreawnerSlctnView.do`
- **주택청약 용어설명** — `txt/vocab.txt` (3996자) · `/ar/ard/selectSubscriptVocabularyView.do`
- **APT청약안내 청약신청방법** — `txt/guide-howto.txt` (2929자) · `/ar/ara/selectSubscrptIntroHowToReqstView.do`
- **APT청약안내 잔여세대** — `txt/guide-remndr.txt` (2810자) · `/ar/ara/selectSubscrptIntroRemndrHshldView.do`
- **APT 청약안내 청약주택** — `txt/guide-house.txt` (2056자) · `/ar/ara/selectSubscrptIntroHouseView.do`

## G.공지사항
- **자주 묻는 질문** — `txt/faq.txt` (9651자) · `/cu/cub/selectFAQList.do`
- **공지사항** — `txt/notice.txt` (2246자) · `/cu/cua/selectNoticeListView.do`
