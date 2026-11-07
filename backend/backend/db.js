import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

function sslOptions() {
  const mode = process.env.DB_SSL_MODE ?? "trust";
  if (mode === "disable") return undefined;
  if (mode === "verify-full") return { ca: readFileSync(process.env.DB_SSL_CA_FILE) };
  return { rejectUnauthorized: false };
}

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME ?? "shinjung",
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: sslOptions(),
    connectionLimit: 10,
    // DATETIME을 시간대 변환 없이 DB에 저장된 글자 그대로 읽습니다.
    dateStrings: true,
  });
}

// 개발 중에는 파일을 저장할 때마다 코드가 다시 읽힙니다.
// 그때마다 DB 연결 묶음(풀)이 새로 생기지 않도록 하나를 전역에 보관해 재사용합니다.
const pool = globalThis.shinjungDbPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalThis.shinjungDbPool = pool;
}

/**
 * work 안의 SQL을 하나의 트랜잭션으로 실행합니다.
 * work가 끝까지 성공하면 저장하고, 중간에 오류가 나면 전부 취소합니다.
 * (Java의 @Transactional이 하던 일입니다)
 */
export async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      // 연결이 끊긴 경우 등입니다. 원래 오류를 가리지 않도록 기록만 남깁니다.
      console.error("트랜잭션 취소 실패", rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}
