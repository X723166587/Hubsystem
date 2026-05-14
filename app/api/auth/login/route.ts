import { NextResponse } from 'next/server';
import { queryD1 } from '@/googleSheet';

export const runtime = 'edge';

/**
 * 统一处理手机号格式为 E.164 (+61...)
 */
function formatAUPhone(phone: string): string {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '61' + digits.slice(1);
  }
  if (!digits.startsWith('61')) {
    digits = '61' + digits;
  }
  return '+' + digits;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, name } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }

    const formattedPhone = formatAUPhone(phone);
    const finalName = name?.trim() || 'Customer';

    await queryD1(
      `INSERT INTO members (phone, name) VALUES (?, ?) 
       ON CONFLICT(phone) DO UPDATE SET name = excluded.name`,
      [formattedPhone, finalName]
    );

    const member = await queryD1('SELECT phone, name FROM members WHERE phone = ?', [formattedPhone]);
    return NextResponse.json({ success: true, member: member[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
