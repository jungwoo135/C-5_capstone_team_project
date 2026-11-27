/**
 * 위도·경도 계산 도우미. (안전 장소 추천, 도착 판별에서 함께 사용)
 * 모든 거리는 미터 단위입니다.
 */

const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/** 위도(-90~90)·경도(-180~180) 숫자인지 검사합니다. */
export function isValidLatLng(lat, lng) {
  return (
    typeof lat === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === "number" && Number.isFinite(lng) && lng >= -180 && lng <= 180
  );
}

/**
 * 두 지점 사이의 직선 거리(미터). 지구를 공으로 보고 계산하는 하버사인 공식입니다.
 * 수 km 이내에서는 오차가 수십 cm 수준이라 도착 판별·장소 추천에 충분합니다.
 */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a)));
}

/** 두 지점의 중간 지점. (수 km 이내에서는 단순 평균으로 충분합니다) */
export function midpoint(lat1, lng1, lat2, lng2) {
  return { latitude: (lat1 + lat2) / 2, longitude: (lng1 + lng2) / 2 };
}

/**
 * 중심에서 radiusM 안에 들어올 수 있는 위도·경도 범위(사각형).
 * DB에서 BETWEEN으로 후보를 빠르게 거른 뒤, 정확한 거리는 distanceMeters로 다시 잽니다.
 */
export function boundingBox(lat, lng, radiusM) {
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.max(Math.cos(toRad(lat)), 1e-6);
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}
