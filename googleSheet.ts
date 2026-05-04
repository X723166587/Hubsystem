/**
 * Cloudflare D1 Database Client
 * Refactored from Google Sheets for production scalability.
 */

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_DATABASE_ID = process.env.CF_DATABASE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

export const queryD1 = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DATABASE_ID}/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  const data = await response.json();

  if (!data.success) {
    console.error('[D1 Error]', data.errors);
    throw new Error(data.errors?.[0]?.message || 'Database query failed');
  }

  // D1 query API 返回的是结果数组中的第一个结果集的 results
  return data.result[0].results as T[];
};