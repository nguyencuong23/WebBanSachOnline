import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

export async function withSqlServer(fn) {
  const pool = await sql.connect(process.env.SQLSERVER_CONNECTION_STRING);
  try {
    return await fn(pool);
  } finally {
    await pool.close();
  }
}

export async function queryAll(pool, table) {
  const res = await pool.request().query(`select * from ${table}`);
  return res.recordset;
}

