# 청약홈 전체 사이트맵 (인증 상태 추출, 67+ 링크)

> 출처 applyhome.co.kr · insane-search + 로그인 세션(Playwright). 사이트맵은 JS 레이어라 별도 URL 없음 — 전체 메뉴 링크로 재구성.

## 1. 청약신청
| 메뉴 | 경로 |
|---|---|
| APT 청약신청(특공/1·2순위/무순위/임의공급/불법행위재공급) | `/ap/aph/reqst/selectSubscrtReqstAptMainView.do` (`?se=01&ty=10` 등) |
| APT 청약신청 내역조회 | `/ap/apa/selectAptSpsplySubscrptReqstList.do` |
| APT 청약취소 | `/ap/apa/selectAptSpsplySubscrptCanclList.do` |
| 오피스텔/생숙/도시형/민간임대 신청 | `/ap/apb/reqst/selectSubscrtReqstUOMainView.do` |
| 〃 내역조회 / 취소 | `/ap/apb/selectUrbtyOfctlSubscrptReqstList.do` / `...CanclList.do` |
| 공공지원민간임대 신청 | `/ap/apc/reqst/selectSubscrtReqstPRMainView.do` |
| 〃 내역조회 / 취소 | `/ap/apc/selectPrvateRentSubscrptReqstList.do` / `...CanclList.do` |

## 2. 청약당첨조회 🔒(로그인)
| 메뉴 | 경로 |
|---|---|
| APT 당첨조회 | `/wa/waa/selectAptPrzwinDescList.do` |
| 오피스텔/생숙/도시형/민간임대 당첨 | `/wa/wab/selectOfctlUrbtyPrzwinHouseList.do` |
| 공공지원민간임대 당첨 | `/wa/wac/selectPrvateRentPrzwinHouseList.do` |
| 주택조합 동·호수 추첨결과 | `/wa/wad/selectMxtrHouseDrwtList.do` |
| APT당첨사실조회 | `/wa/waa/selectAptPrzwinCnfrmnList.do` |

## 3. 청약자격확인 🔒(로그인)
| 메뉴 | 경로 |
|---|---|
| 세대구성원 등록/조회 | `/ra/rab/selectHshldInfoProvdAgreRequestView.do` |
| 세대구성원 동의 | `/ra/rab/selectHshldMbInfoProvdAgreView.do` |
| 청약제한사항확인 | `/co/cob/selectSubscrptLmttCnList.do` |
| 주택소유확인 | `/ap/apd/selectHousePosesnList.do` |
| 청약통장 가입내역 | `/ap/apd/selectSubscrptBnkbSbscrbDesc.do` |
| 순위확인서 발급 / 발급내역 | `/cu/cud/selectRankCnfrmnIssuView.do` / `/cu/cue/...` |

## 4. 청약자격진단 · 연습
| 메뉴 | 경로 |
|---|---|
| 청약자격진단 | `/co/coc/selectSubscrptQualfDiagMain.do` |
| 공고단지 청약연습 | `/ap/apr/reqst/selectSubscrtReqstAptMainView.do` |
| 연습내역 조회 | `/ra/raa/selectAptSpsplyPreparSubscrptReqstList.do` |
| 청약가점계산기 | `/ap/apg/selectAddpntCalculatorView.do` |
| 청약가상체험 | `/ap/app/reqst/selectSubscrtReqstAptMainView.do` |

## 5. 청약일정 · 통계
| 메뉴 | 경로 |
|---|---|
| 청약캘린더(청약일정) | `/ai/aib/selectSubscrptCalenderView.do` (데이터 `/ai/aib/selectSubscrptCalender.do`) |
| 청약알리미 신청 🔒 | `/cu/cuc/selectSubscrptAllimiView.do` |
| 분양정보/경쟁률 (APT) | `/ai/aia/selectAPTLttotPblancListView.do` |
| 오피스텔/생숙/도시형/(공공지원)민간임대 | `/ai/aia/selectOtherLttotPblancListView.do` |
| APT 잔여세대 | `/ai/aia/selectAPTRemndrLttotPblancListView.do` |
| 민간사전청약 | `/ap/apk/selectAPTLttotPblancListView.do` |
| 청약통장 통계(전체/통장별/가입기간별) | `/ai/aie/selectSubscrptBnkbAllSbscrbStusView.do` / `...Accto...` / `...PdAccto...` |
| 입주(예정)정보 | `/ai/aia/selectAPTMvnPrearngeHsHldcoList.do` |

## 6. 청약제도안내
| 메뉴 | 경로 |
|---|---|
| 청약주택 | `/ar/ara/selectSubscrptIntroHouseView.do` |
| 청약통장 | `/ar/ara/selectSubscrptIntroBnkbView.do` |
| 청약자격 | `/ar/ara/selectSubscrptIntroQualfView.do` |
| 특별공급 | `/ar/ara/selectSubscrptIntroSpetialView.do` |
| 청약신청방법 | `/ar/ara/selectSubscrptIntroHowToReqstView.do` |
| 당첨자 선정 | `/ar/ara/selectSubscrptIntroPreawnerSlctnView.do` |
| 잔여세대 | `/ar/ara/selectSubscrptIntroRemndrHshldView.do` |
| 오피스텔 등 안내(주택정보/신청방법/당첨자선정) | `/ar/arb/selectPROU...` |
| 주택청약 상품정보(예치금) | `/ar/arb/selectsubscriptionDepositInfoView.do` |
| 규제지역정보 | `/ai/aic/selectSpecltSubscrptRndAreaList.do` |
| 주택청약 용어설명 | `/ar/ard/selectSubscriptVocabularyView.do` |

## 7. 청약소통방 (게시판)
| 메뉴 | 경로 |
|---|---|
| 공지사항 | `/cu/cua/selectNoticeListView.do` |
| 자주묻는질문(FAQ) | `/cu/cub/selectFAQList.do` |
| 사전청약 당첨취소자 조회 | `/cu/cui/selectAdvPrzwnerCanclView.do` |
| 분양권 정보(전매제한 등) | `/rs/rsa/selectResaleListView.do` |

🔒 = 로그인(공동/금융/간편인증) 필요. 나머지는 비로그인 접근 가능.
