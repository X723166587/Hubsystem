/**
 * Cloudflare D1 Database Client
 * Refactored from Google Sheets for production scalability.
 */

const CF_ACCOUNT_ID = "363a6bff837a4027f707a8151131f86d";
const CF_DATABASE_ID = "07c5b556-ca2c-4b13-bbb4-2ed57d50e22a";
const CF_API_TOKEN = "cfut_EKe6pGT3pVcp8vvsU6XV4akntr2ZDqZQ0EBb8iqt633ced95";

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

  // D1 query API 返回的是结果数组
  return data.result[0].results as T[];
};