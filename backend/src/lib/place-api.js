/** 안전 장소 추천 API를 호출하는 화면용 함수 모음. */

async function callApi(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error("서버에 연결할 수 없습니다.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.detail ?? `요청에 실패했습니다. (오류 코드 ${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

const jsonPost = (data) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data ?? {}),
});

/**
 * 내 위치 제출. 상대 위치는 서버만 알고 앱으로 내려오지 않습니다.
 * 응답의 partnerSubmitted가 true면 바로 getSafePlaces를 부를 수 있습니다.
 */
export async function submitMyLocation(roomId, latitude, longitude) {
  return callApi(`/api/chats/${roomId}/location`, jsonPost({ latitude, longitude }));
}

/**
 * 두 사람 중간 지점 주변 안전 장소 추천 (최대 5곳, 점수 순).
 * ready가 false면 아직 한쪽이 위치를 안 낸 것입니다. (mySubmitted / partnerSubmitted로 누가 안 냈는지 확인)
 * 각 장소: placeType(POLICE|CCTV), placeName, address, latitude, longitude, distanceM, score
 */
export async function getSafePlaces(roomId, radiusM = 1000) {
  return callApi(`/api/chats/${roomId}/places?radius=${radiusM}`);
}
