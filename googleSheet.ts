/**
 * Cloudflare D1 Database Client
 * Refactored from Google Sheets for production scalability.
 */

import { getRequestContext } from '@cloudflare/next-on-pages';

export const queryD1 = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  // 从 Cloudflare 请求上下文中获取绑定的数据库实例 'DB'
  const db = getRequestContext().env.DB;

  if (!db) {
    throw new Error('D1 Database binding (DB) not found. Check wrangler.toml and Cloudflare dashboard.');
  }

  const { results } = await db.prepare(sql).bind(...params).all();
  return results as T[];
};