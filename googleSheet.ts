/**
 * Cloudflare D1 Database Client
 * Refactored from Google Sheets for production scalability.
 */


import { getRequestContext } from '@cloudflare/next-on-pages';

export const queryD1 = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    // 1. 尝试使用 D1 Binding (生产/预览环境的最佳实践)
  let env: any = {};
  try {
    const context = getRequestContext();
    env = context.env || {};
    const db = env.DB;

    if (db) {
      const { results } = await db.prepare(sql).bind(...params).all();
      return results as T[];
    }
  } catch (e) {
    // 本地开发环境或未开启 nodejs_compat 时，回退到 process.env
  }

  // 2. API 回退逻辑：优先从 context.env 读取变量，如果没有则回退到 process.env
  const CF_ACCOUNT_ID = env.CF_ACCOUNT_ID || (typeof process !== 'undefined' ? process.env.CF_ACCOUNT_ID : undefined);
  const CF_DATABASE_ID = env.CF_DATABASE_ID || (typeof process !== 'undefined' ? process.env.CF_DATABASE_ID : undefined);
  const CF_API_TOKEN = env.CF_API_TOKEN || (typeof process !== 'undefined' ? process.env.CF_API_TOKEN : undefined);

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

/**
 * 发送确认短信 (Kudosity / TransmitSMS)
 */
export const sendSMS = async (to: string, message: string) => {
  let env: any = {};
  try {
    const context = getRequestContext();
    env = context.env || {};
  } catch (e) {}

  const API_KEY = env.SMS_API_KEY || (typeof process !== 'undefined' ? process.env.SMS_API_KEY : undefined);
  const API_SECRET = env.SMS_API_SECRET || (typeof process !== 'undefined' ? process.env.SMS_API_SECRET : undefined);
  
  if (!API_KEY || !API_SECRET) {
    throw new Error('SMS API configuration missing: SMS_API_KEY or SMS_API_SECRET');
  }
  
  // Edge Runtime 使用 btoa 进行 Basic Auth 编码
  const auth = btoa(`${API_KEY}:${API_SECRET}`);

  const response = await fetch('https://api.transmitsms.com/send-sms.json', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ to, message }),
  });

  return response.json();
};