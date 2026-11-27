# 채팅 · 안전 장소 · 거래 약속 — 화면 연동 안내 (프론트엔드용)

백엔드 v3에서 추가된 기능을 **화면 순서대로** 어떤 API를 어떤 순서로 부르면 되는지 정리했습니다.
호출 함수는 `src/lib/chat-api.js`, `place-api.js`, `appointment-api.js`, `report-api.js`에 있고, 아래 주소는 그 함수들이 부르는 실제 API입니다.
모든 API는 로그인 쿠키가 필요합니다. 오류는 `{ status, detail }` 형식이며 `detail`을 그대로 화면에 보여 주면 됩니다.

## 1. Item_detail → 채팅 버튼

```
POST /api/chats  { itemId }
→ 201 { roomId, ... , created: true }   // 새 방
→ 200 { roomId, ... , created: false }  // 이미 내가 연 방이 있음
→ 400 내 물품 / 403 차단 관계 / 409 판매 완료 물품
```
`roomId`를 들고 Chat_room 화면으로 이동합니다.

## 2. Chat_list

```
GET /api/chats
→ { rooms: [ { roomId, itemTitle, itemImage, salesStatus, myRole, partnerNickname, lastMessage, lastMessageAt, unreadCount } ], totalUnread }
```
- `totalUnread`는 하단 탭의 빨간 숫자에 쓰세요.
- 목록은 최근 대화 순으로 이미 정렬되어 옵니다.
- 이 화면도 10초쯤마다 다시 불러오면 새 대화가 보입니다.

## 3. Chat_room — 실시간은 "폴링"으로 합니다

```
들어올 때:   GET /api/chats/{roomId}/messages            → 최근 50개 + lastMessageId
            POST /api/chats/{roomId}/read                → 상대 메시지 읽음 처리
3초마다:     GET /api/chats/{roomId}/messages?after=<lastMessageId>
            → messages가 비어 있지 않으면 화면에 붙이고 lastMessageId 갱신 후 다시 read 호출
보낼 때:     POST /api/chats/{roomId}/messages { content } → 201 메시지 1건 (바로 화면에 붙이고 lastMessageId 갱신)
나갈 때:     폴링 타이머 정지
```
`chat-api.js`의 `startPolling(roomId, lastMessageId, onNewMessages)`가 위 "3초마다" 부분을 대신해 줍니다. 돌려받은 함수를 화면을 나갈 때 호출하면 멈춥니다.

메시지 항목: `{ messageId, senderId, mine, content, createdAt, readAt }` — `mine`이 true면 오른쪽 말풍선, `readAt`이 있으면 "읽음" 표시.

메시지 길게 누르기 → 신고: `POST /api/reports { targetType: "MESSAGE", targetId: messageId, reason, detail? }`

## 4. Chat_room → "안전 존 추천" 버튼 → Place_recommend

```
① 내 위치 공유 동의 → GPS 좌표 → POST /api/chats/{roomId}/location { latitude, longitude }
   → { partnerSubmitted: true/false }
② GET /api/chats/{roomId}/places?radius=1000
   → ready: false  → "상대방의 위치 공유를 기다리는 중" (mySubmitted / partnerSubmitted로 문구 결정)
   → ready: true   → places: [ { placeType: "POLICE"|"CCTV", placeName, address, latitude, longitude, distanceM, score } ] 최대 5곳
```
- 상대의 좌표와 중간 지점은 **일부러 내려주지 않습니다.** 지도에는 추천 장소 핀만 찍으세요.
- `distanceM`은 두 사람의 중간 지점에서 그 장소까지의 거리입니다.
- 반경을 넓히려면 `radius=2000`처럼 (최대 3000).
- 상대가 아직이면 ②를 5~10초마다 다시 부르거나, 채팅으로 "위치 공유해 주세요"를 보내게 하세요.

## 5. Place_recommend에서 장소 선택 → 약속 제안

```
POST /api/chats/{roomId}/appointment
  { placeName, latitude, longitude, scheduledAt: "2026-11-28 14:00" }   // 한국 시간
→ 201 { appointmentId, status: "PROPOSED", proposedByMe: true, ... }
→ 409 이미 진행 중인 약속이 있음 (먼저 취소) / 409 판매 완료 물품
```
추천 결과의 `placeName / latitude / longitude`를 그대로 넘기면 됩니다. 추천 장소가 아닌 곳도 가능합니다.

## 6. Chat_room 상단 "약속 카드"

```
GET /api/chats/{roomId}/appointment
→ { appointment: null }  또는
→ { appointment: { appointmentId, status, proposedByMe, placeName, latitude, longitude, scheduledAt,
                   myArrivedAt, partnerArrivedAt, arrivalRadiusM } }
```
상태별 버튼:

| status | 제안한 사람 화면 | 상대 화면 |
| --- | --- | --- |
| PROPOSED | "상대 확정 대기" + [취소] | [확정] [거절(=취소)] |
| CONFIRMED | [도착 확인] [취소] | [도착 확인] [취소] |
| DONE | 판매자: [거래 완료] / 구매자: "판매자의 완료 대기" | |
| CANCELLED | (카드 숨김 또는 "취소됨") | |

- 확정: `POST /api/appointments/{id}/confirm` → 물품이 자동으로 **예약 중(RESERVED)** 이 됩니다.
- 취소: `POST /api/appointments/{id}/cancel` → 예약 중이던 물품은 **판매 중(ON_SALE)** 으로 돌아갑니다.

## 7. 도착 확인

```
POST /api/appointments/{id}/arrive { latitude, longitude }   // 지금 GPS
→ 200 { myArrivedAt, partnerArrivedAt, bothArrived, status, distanceM }
→ 409 "약속 장소까지 320m 남았습니다. (100m 안에서 확인됩니다)"
→ 409 "도착 확인은 약속 시각 60분 전부터 할 수 있습니다."
→ 409 "약속 시각에서 60분이 지나 도착 확인이 마감되었습니다."
```
- 409의 `detail`을 그대로 토스트로 띄우면 됩니다.
- `bothArrived: true`가 되면 판매자 화면에 **[거래 완료]** 버튼을 보여 주세요.
- 상대가 도착했는지는 약속 카드(6번)를 다시 불러 `partnerArrivedAt`으로 확인합니다.

## 8. 거래 완료 (채팅방 안에서)

```
POST /api/chats/{roomId}/complete        // 판매자만. 구매자는 방에서 자동
→ 201 { salesId, purchaseId, itemId, salesStatus: "SOLD", buyerId, roomId }
→ 403 구매자가 누름 / 409 이미 판매 완료
```
기존 `POST /api/trades/complete { itemId, buyerId }`도 그대로 있지만, 채팅방이 있으면 이쪽이 간단합니다.

## 9. Trade_review (거래 평가 + 한 줄 후기)

```
POST /api/evaluations
  { itemId, memberTypeCode: "BUYER"|"SELLER", mannerScore, commScore, timeScore, reviewText? }
→ 201 { evalId, targetUserId, newTrustScore, grantedBadges, reviewText }
```
`reviewText`는 선택(500자 이하). 받은 후기는 상대 프로필 `GET /api/users/{id}`의 `recentReviews`(최근 5개)에 나옵니다.

## 10. 신고 버튼 (프로필 · 물품 상세 · 메시지)

```
POST /api/reports { targetType: "USER"|"ITEM"|"MESSAGE", targetId, reason: "FRAUD"|"ABUSE"|"SPAM"|"FAKE"|"OTHER", detail? }
→ 201 { reportId, received: true }
→ 400 자기 자신·내 물품·내 메시지 / 409 이미 신고함
```
사유 표시 문구: FRAUD 사기 의심 · ABUSE 욕설/괴롭힘 · SPAM 광고/도배 · FAKE 허위 매물/가품 · OTHER 기타

## 자주 묻는 것

- **왜 WebSocket이 아니라 폴링인가요?** 지금 서버 구조(Next.js + nginx + PM2)에 별도 서버 없이 바로 동작하고, 3초 지연은 중고거래 채팅에 충분해서입니다. 나중에 바꿔도 화면 코드는 `startPolling` 부분만 바뀝니다.
- **GPS 권한을 거부하면?** 위치 제출·도착 확인만 못 하고, 채팅·약속 제안(장소 직접 입력)은 됩니다. 권한 요청 문구를 안내하세요.
- **시간 형식은?** `"YYYY-MM-DD HH:MM"` 한국 시간 문자열. 응답의 시각은 `"2026-11-28T14:00:00"` 형식(한국 시간, 시간대 표시 없음)입니다.
