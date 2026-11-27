import {
  SAFE_PLACE_BASE_SCORE,
  SAFE_PLACE_RADIUS_DEFAULT_M,
  SAFE_PLACE_RADIUS_MAX_M,
} from "./constants.js";
import { getRoomForMember } from "./chat-service.js";
import { query, withTransaction } from "./db.js";
import { boundingBox, distanceMeters, isValidLatLng, midpoint } from "./geo.js";
import { ApiError } from "./http.js";
import { koreaNow } from "./time.js";

/*
 * 안전 장소 추천
 *
 * 1. 채팅방 참여자가 각자 "내 위치"만 서버에 제출합니다. (상대 위치는 앱으로 내려가지 않음)
 * 2. 두 사람 위치가 모두 모이면 중간 지점을 구하고,
 * 3. 그 주변 반경 안의 안전 장소(경찰관서, CCTV 밀집 구역)를 DB에서 찾아
 * 4. 점수를 매겨 가까운·안전한 순으로 돌려줍니다.
 */

function isDuplicateError(error) {
  return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || /duplicate/i.test(error?.message ?? "");
}

/** 내 위치 제출 (있으면 갱신). 응답에는 상대가 제출했는지 여부만 들어가고, 상대 좌표는 없습니다. */
export async function submitLocation({ userId, roomId, latitude, longitude }) {
  if (!isValidLatLng(latitude, longitude)) throw new ApiError(400, "latitude, longitude가 올바르지 않습니다.");
  const room = await getRoomForMember(roomId, userId);
  const now = koreaNow();

  await withTransaction(async (connection) => {
    const [updated] = await connection.execute(
      "UPDATE chat_location SET latitude = ?, longitude = ?, submitted_at = ? WHERE room_id = ? AND user_id = ?",
      [latitude, longitude, now, roomId, userId],
    );
    if (Number(updated.affectedRows ?? 0) === 0) {
      try {
        await connection.execute(
          "INSERT INTO chat_location (room_id, user_id, latitude, longitude, submitted_at) VALUES (?, ?, ?, ?, ?)",
          [roomId, userId, latitude, longitude, now],
        );
      } catch (error) {
        if (!isDuplicateError(error)) throw error;
        await connection.execute(
          "UPDATE chat_location SET latitude = ?, longitude = ?, submitted_at = ? WHERE room_id = ? AND user_id = ?",
          [latitude, longitude, now, roomId, userId],
        );
      }
    }
  });

  const partner = await query("SELECT submitted_at FROM chat_location WHERE room_id = ? AND user_id = ?", [roomId, room.partnerId]);
  return {
    roomId,
    submittedAt: now.replace(" ", "T"),
    partnerSubmitted: partner.length > 0,
  };
}

/** 안전 장소 한 곳의 점수. 종류 점수에, 중간 지점에서 멀수록 조금씩 감점합니다. */
export function scorePlace(place, distanceM, radiusM) {
  const base = SAFE_PLACE_BASE_SCORE[place.placeType] ?? 1;
  // CCTV 구역은 대수가 많을수록 최대 +0.5점 (경찰관서 3점을 넘지 않도록)
  const density = place.placeType === "CCTV" ? Math.min((place.cctvCount ?? 0) / 20, 0.5) : 0;
  const distancePenalty = distanceM / radiusM; // 0(중심) ~ 1(가장자리)
  return Math.round((base + density - distancePenalty) * 100) / 100;
}

/** 중심 좌표 주변의 안전 장소를 점수 순으로 돌려줍니다. (추천과 "내 주변 보기"가 함께 사용) */
export async function findSafePlacesAround({ latitude, longitude, radiusM, limit = 5 }) {
  const box = boundingBox(latitude, longitude, radiusM);
  const rows = await query(
    `SELECT place_id, place_type, place_name, address, latitude, longitude, cctv_count
       FROM safe_place
      WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?`,
    [box.minLat, box.maxLat, box.minLng, box.maxLng],
  );
  const places = rows
    .map((row) => {
      const place = {
        placeId: Number(row.place_id),
        placeType: row.place_type,
        placeName: row.place_name,
        address: row.address ?? null,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        cctvCount: row.cctv_count === null || row.cctv_count === undefined ? null : Number(row.cctv_count),
      };
      place.distanceM = distanceMeters(latitude, longitude, place.latitude, place.longitude);
      return place;
    })
    .filter((place) => place.distanceM <= radiusM)
    .map((place) => ({ ...place, score: scorePlace(place, place.distanceM, radiusM) }))
    .sort((a, b) => b.score - a.score || a.distanceM - b.distanceM);
  return places.slice(0, limit);
}

/**
 * 채팅방 두 참여자의 중간 지점 주변 안전 장소 추천.
 * 둘 중 한 명이라도 위치를 안 냈으면 추천 없이 "누가 아직인지"만 알려 줍니다.
 */
export async function recommendPlaces({ userId, roomId, radiusM = SAFE_PLACE_RADIUS_DEFAULT_M }) {
  const radius = Math.min(Math.max(Number(radiusM) || SAFE_PLACE_RADIUS_DEFAULT_M, 100), SAFE_PLACE_RADIUS_MAX_M);
  const room = await getRoomForMember(roomId, userId);
  const rows = await query(
    "SELECT user_id, latitude, longitude FROM chat_location WHERE room_id = ? AND user_id IN (?, ?)",
    [roomId, userId, room.partnerId],
  );
  const mine = rows.find((row) => Number(row.user_id) === userId);
  const partner = rows.find((row) => Number(row.user_id) === room.partnerId);
  if (!mine || !partner) {
    return {
      roomId,
      ready: false,
      mySubmitted: Boolean(mine),
      partnerSubmitted: Boolean(partner),
      radiusM: radius,
      places: [],
    };
  }
  const center = midpoint(Number(mine.latitude), Number(mine.longitude), Number(partner.latitude), Number(partner.longitude));
  const places = await findSafePlacesAround({ ...center, radiusM: radius, limit: 5 });
  // 중간 지점 좌표는 일부러 돌려주지 않습니다.
  // 내 위치를 아는 사람이 중간 지점까지 알면 "상대 위치 = 중간 × 2 − 내 위치"로 정확히 계산되기 때문입니다.
  // 추천 장소 목록만으로는 반경(기본 1km) 안의 대략적인 범위만 짐작할 수 있습니다.
  return {
    roomId,
    ready: true,
    mySubmitted: true,
    partnerSubmitted: true,
    radiusM: radius,
    places, // 각 장소의 distanceM은 중간 지점에서의 거리입니다.
  };
}
