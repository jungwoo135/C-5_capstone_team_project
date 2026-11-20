# Python AI 서버 연동 규격 (물품 인증)

백엔드(Next.js)가 물품 인증 요청을 받으면 Python AI 서버를 아래 형식으로 호출합니다.
AI 서버를 개발하는 팀원은 이 규격만 맞추면 됩니다. 연습용으로 같은 규격의 모의 서버가
`ai-mock/ai_mock_server.py`에 있으니 참고하세요.

## 1. 주소와 방식

- 백엔드의 `.env.local`에 적힌 `AI_SERVER_URL`로 **HTTP POST** 요청을 보냅니다.
  - 예: `AI_SERVER_URL=http://127.0.0.1:8600/verify`
- 요청·응답 모두 JSON입니다. (`Content-Type: application/json`)

## 2. 요청 (백엔드 → AI 서버)

```json
{
  "itemId": 3,
  "authType": "정품 영수증",
  "serialNumber": "SN-12345",
  "authImage": "https://예시저장소/auth/3.jpg"
}
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| itemId | 정수 | 인증 대상 물품 ID |
| authType | 문자열 | 인증 유형 (영수증, 시리얼, 보증서 등) |
| serialNumber | 문자열 또는 null | 시리얼 번호 (없으면 null) |
| authImage | 문자열 또는 null | 인증 사진 주소 (없으면 null) |

## 3. 응답 (AI 서버 → 백엔드)

HTTP 200과 함께 아래 JSON을 돌려줍니다.

```json
{
  "photoVerified": true,
  "reliabilityScore": 87.5,
  "modelVersion": "mock-1"
}
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| photoVerified | 불리언 | 사진 검토 통과 여부 → `item.ai_photo_verified`에 저장 |
| reliabilityScore | 숫자 (0~100) | 신뢰도 수치 → `item_authentication.reliability_score`에 저장 |
| modelVersion | 문자열 (선택) | 모델 버전 (백엔드는 기록하지 않지만 넣어도 됨) |

## 4. 꼭 지켜야 하는 규칙

1. **8초 안에 응답해야 합니다.** 백엔드는 `AI_SERVER_TIMEOUT_MS`(기본 8000ms)가 지나면
   요청을 끊고 사용자에게 502 오류를 보여줍니다. 이때 DB에는 아무것도 저장되지 않습니다.
2. `photoVerified`는 반드시 true/false, `reliabilityScore`는 반드시 0~100 숫자여야 합니다.
   형식이 다르면 백엔드가 502로 처리합니다.
3. 실패(모델 오류 등)는 200이 아닌 상태 코드(예: 500)로 답하면 됩니다. 백엔드가 502로 바꿔
   사용자에게 알립니다.

## 5. 직접 확인하는 방법

모의 서버 실행 (Python 3만 있으면 됨, 추가 설치 없음):

```
python3 ai-mock/ai_mock_server.py
```

다른 터미널에서 호출해 보기:

```
curl -s -X POST http://127.0.0.1:8600/verify -H "Content-Type: application/json" -d "{\"itemId\":3,\"authType\":\"receipt\",\"serialNumber\":\"SN-1\",\"authImage\":null}"
```

`photoVerified`와 `reliabilityScore`가 담긴 JSON이 나오면 규격에 맞는 것입니다.
