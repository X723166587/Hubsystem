import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const env = getRequestContext().env;
    const authDb = env.AUTH_DB;

    if (!authDb) {
      return NextResponse.json({ error: 'Auth database not bound' }, { status: 500 });
    }

    // 查询用户信息
    const user = await authDb.prepare(
      'SELECT * FROM users WHERE username = ? AND password = ?'
    ).bind(username, password).first();

    if (user) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}