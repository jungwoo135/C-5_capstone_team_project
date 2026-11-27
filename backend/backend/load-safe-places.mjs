#!/usr/bin/env node
/**
 * 공공데이터 CSV → safe_place 테이블용 SQL 파일 생성기
 *
 * DB에 직접 붙지 않고 SQL 파일을 만들어 줍니다. 내용을 눈으로 확인한 뒤
 * 기존처럼 mysql 명령으로 넣으면 됩니다. 같은 (종류, 출처)의 이전 데이터를 먼저 지우므로
 * 같은 파일을 두 번 넣어도 중복되지 않습니다.
 *
 * 사용법 (한 줄):
 *   경찰관서:
 *     node backend/load-safe-places.mjs --type POLICE --file 경찰관서.csv --name 관서명 --address 주소 --source "경찰청 2026" --out police.sql
 *   CCTV (약 100m 격자로 묶어 대수를 셉니다):
 *     node backend/load-safe-places.mjs --type CCTV --file cctv.csv --count 카메라대수 --address 소재지도로명주소 --source "CCTV표준데이터 2026" --out cctv.sql
 *   DB 적용:
 *     mysql -h <RDS주소> -u admin -p --ssl-ca=$HOME/global-bundle.pem --ssl-verify-server-cert shinjung < police.sql
 *
 * 옵션:
 *   --type      POLICE 또는 CCTV (필수)
 *   --file      CSV 파일 경로 (필수)
 *   --out       만들 SQL 파일 경로 (필수)
 *   --lat/--lng 위도/경도 열 이름 (기본 "위도"/"경도", 일부만 적어도 찾습니다)
 *   --name      장소명 열 이름 (POLICE 필수, CCTV는 무시)
 *   --address   주소 열 이름 (선택)
 *   --count     CCTV 대수 열 이름 (선택, 없으면 1대로 셉니다)
 *   --grid      CCTV 격자 크기(미터, 기본 100)
 *   --encoding  CSV 인코딩 (기본 utf-8. 공공데이터는 euc-kr인 경우가 많습니다. 한글이 깨지면 --encoding euc-kr)
 *   --source    데이터 출처 표시 (기본: 파일 이름)
 *   --bbox      "minLat,minLng,maxLat,maxLng" 로 지역 제한 (선택. 예: 서울 "37.41,126.76,37.72,127.19")
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      args[key] = value;
    }
  }
  return args;
}

/** 따옴표·줄바꿈을 처리하는 간단한 CSV 파서 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function findColumn(header, wanted, label, required) {
  if (!wanted) {
    if (required) fail(`--${label} 열 이름이 필요합니다. CSV 머리글: ${header.join(" | ")}`);
    return -1;
  }
  let idx = header.findIndex((h) => h.trim() === wanted);
  if (idx < 0) idx = header.findIndex((h) => h.includes(wanted));
  if (idx < 0) fail(`"${wanted}" 열을 찾을 수 없습니다. CSV 머리글: ${header.join(" | ")}`);
  return idx;
}

function fail(message) {
  console.error(`오류: ${message}`);
  process.exit(1);
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

const args = parseArgs(process.argv.slice(2));
const type = (args.type ?? "").toUpperCase();
if (!["POLICE", "CCTV"].includes(type)) fail("--type 은 POLICE 또는 CCTV 여야 합니다.");
if (!args.file) fail("--file 로 CSV 파일을 지정하세요.");
if (!args.out) fail("--out 으로 만들 SQL 파일 이름을 지정하세요.");

const encoding = args.encoding ?? "utf-8";
let text;
try {
  text = new TextDecoder(encoding).decode(readFileSync(args.file));
} catch (error) {
  fail(`파일을 읽을 수 없습니다 (${encoding}): ${error.message}`);
}
text = text.replace(/^﻿/, ""); // BOM 제거

const rows = parseCsv(text);
if (rows.length < 2) fail("CSV에 데이터 행이 없습니다.");
const header = rows[0].map((h) => h.trim());
const latIdx = findColumn(header, args.lat ?? "위도", "lat", true);
const lngIdx = findColumn(header, args.lng ?? "경도", "lng", true);
const nameIdx = type === "POLICE" ? findColumn(header, args.name, "name", true) : -1;
const addrIdx = args.address ? findColumn(header, args.address, "address", false) : -1;
const countIdx = type === "CCTV" && args.count ? findColumn(header, args.count, "count", false) : -1;
const source = args.source ?? basename(args.file);
const gridM = Number(args.grid ?? 100);

let bbox = null;
if (args.bbox) {
  const parts = args.bbox.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) fail("--bbox 형식: minLat,minLng,maxLat,maxLng");
  bbox = { minLat: parts[0], minLng: parts[1], maxLat: parts[2], maxLng: parts[3] };
}

let skipped = 0;
const records = [];
for (const row of rows.slice(1)) {
  const lat = Number(row[latIdx]);
  const lng = Number(row[lngIdx]);
  // 한국 범위 밖(좌표 누락, 0, 뒤바뀜 등)은 건너뜁니다.
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) { skipped += 1; continue; }
  if (bbox && (lat < bbox.minLat || lat > bbox.maxLat || lng < bbox.minLng || lng > bbox.maxLng)) { skipped += 1; continue; }
  records.push({
    lat,
    lng,
    name: nameIdx >= 0 ? row[nameIdx]?.trim() : null,
    address: addrIdx >= 0 ? row[addrIdx]?.trim() || null : null,
    count: countIdx >= 0 ? Math.max(Number(row[countIdx]) || 1, 1) : 1,
  });
}
if (records.length === 0) fail("사용할 수 있는 좌표가 있는 행이 없습니다. --lat/--lng 열 이름이나 --encoding 을 확인하세요.");

let places;
if (type === "POLICE") {
  places = records
    .filter((r) => r.name)
    .map((r) => ({ type, name: r.name.slice(0, 200), address: r.address?.slice(0, 300) ?? null, lat: r.lat, lng: r.lng, count: null }));
} else {
  // CCTV: 같은 격자(약 gridM 미터)에 있는 카메라를 한 행으로 묶고 대수를 더합니다.
  const latStep = gridM / 111320; // 위도 1도 ≈ 111.32km
  const cells = new Map();
  for (const r of records) {
    const lngStep = gridM / (111320 * Math.cos((r.lat * Math.PI) / 180));
    const key = `${Math.floor(r.lat / latStep)}:${Math.floor(r.lng / lngStep)}`;
    const cell = cells.get(key) ?? { latSum: 0, lngSum: 0, n: 0, count: 0, address: r.address };
    cell.latSum += r.lat; cell.lngSum += r.lng; cell.n += 1; cell.count += r.count;
    if (!cell.address && r.address) cell.address = r.address;
    cells.set(key, cell);
  }
  places = [...cells.values()].map((c) => ({
    type,
    name: `CCTV 밀집 구역 (${c.count}대)`,
    address: c.address?.slice(0, 300) ?? null,
    lat: Math.round((c.latSum / c.n) * 1e6) / 1e6,
    lng: Math.round((c.lngSum / c.n) * 1e6) / 1e6,
    count: c.count,
  }));
}

const lines = [
  `-- safe_place 적재: type=${type}, source=${source}, rows=${places.length} (원본 ${rows.length - 1}행, 건너뜀 ${skipped}행)`,
  `-- 만든 날짜: ${new Date().toISOString()}`,
  "USE shinjung;",
  `DELETE FROM safe_place WHERE place_type = ${sqlString(type)} AND source = ${sqlString(source)};`,
];
const BATCH = 500;
for (let i = 0; i < places.length; i += BATCH) {
  const values = places
    .slice(i, i + BATCH)
    .map((p) => `(${sqlString(p.type)}, ${sqlString(p.name)}, ${sqlString(p.address)}, ${p.lat}, ${p.lng}, ${p.count ?? "NULL"}, ${sqlString(source)})`)
    .join(",\n");
  lines.push(`INSERT INTO safe_place (place_type, place_name, address, latitude, longitude, cctv_count, source) VALUES\n${values};`);
}
writeFileSync(args.out, `${lines.join("\n")}\n`, "utf-8");
console.log(`완료: ${args.out} 에 ${places.length}행 (원본 ${rows.length - 1}행, 건너뜀 ${skipped}행)`);
