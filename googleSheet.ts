/**
 * Cloudflare D1 Database Client
 * Refactored from Google Sheets for production scalability.
 */


import { getRequestContext } from '@cloudflare/next-on-pages';

export const queryD1 = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    // 1. 尝试使用 D1 Binding (生产/预览环境的最佳实践)
  try {
    const context = getRequestContext();
    const db = context?.env?.DB;

    if (db) {
      const { results } = await db.prepare(sql).bind(...params).all();
      return results as T[];
    }
  } catch (e) {
    // 本地开发环境 getRequestContext 会报错，捕获并进入下方的 API 回退逻辑
  }

  // 2. API 回退逻辑 (主要用于本地 npm run dev)
  const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const CF_DATABASE_ID = process.env.CF_DATABASE_ID;
  const CF_API_TOKEN = process.env.CF_API_TOKEN;

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DATABASE_ID}/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

    const data: any = await response.json();


  if (!data.success) {
    // 增加更详细的调试信息
    const errorMsg = data.errors?.[0]?.message || 'Database query failed';
    console.error('[D1 API Error]', errorMsg, 'Data:', data);
    throw new Error(errorMsg);
  }

  // D1 query API 返回的是结果数组中的第一个结果集的 results
  return data.result[0].results as T[];
};