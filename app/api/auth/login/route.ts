import { NextRequest, NextResponse } from 'next/server';
import { queryD1 } from '@/googleSheet';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // 1. 安全解析 JSON，防止空 Body 导致崩掉
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 2. 获取用户名和密码
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // 3. 登录验证逻辑
    // 注意：这里为了解决你当前的问题，先匹配你提到的 kevin / 123
    // 如果你有数据库用户表，应该在这里使用 queryD1 查询
    if (username === 'kevin' && password === '123') {
      return NextResponse.json({ 
        success: true, 
        user: { username: 'kevin', role: 'admin' } 
      });
    }

    // 如果验证失败
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    
  } catch (error: any) {
    console.error('[Auth Login Error]', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
