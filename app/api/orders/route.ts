/**
 * Orders API Route
 * Handles order listing and updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryD1, sendSMS } from '@/googleSheet';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

/**
 * 统一处理手机号格式为 E.164 (+61...)
 */
function formatAUPhone(phone: string): string {
  let digits = String(phone).replace(/\D/g, '');
  // 处理 04... 格式
  if (digits.startsWith('0')) {
    digits = '61' + digits.slice(1);
  }
  // 如果不是以 61 开头且长度为 9 (澳洲手机去掉首位 0)，补上 61
  if (!digits.startsWith('61')) {
    digits = '61' + digits;
  }
  return '+' + digits;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const date = searchParams.get('date');

    // 整合统计逻辑 (用于图表和总计)
    if (type === 'stats') {
      // 获取全表总行数 (不分日期)
      const totalCountResult = await queryD1('SELECT COUNT(*) as count FROM orders');
      const totalOrders = totalCountResult[0].count;

      // 获取每日订单分布 (最近 14 天)
      const dailyStats = await queryD1(`
        SELECT date(created_at) as date, COUNT(*) as count 
        FROM orders 
        GROUP BY date 
        ORDER BY date DESC 
        LIMIT 14
      `);

      return NextResponse.json({ totalOrders, dailyStats: dailyStats.reverse() });
    }

    // 整合会员查询逻辑
    if (type === 'members') {
      const search = searchParams.get('search');
      let sql = 'SELECT phone, name FROM members';
      let params: any[] = [];
      if (search) {
        sql += ' WHERE name LIKE ? OR phone LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
      }
      sql += ' ORDER BY name ASC';
      const members = await queryD1(sql, params);
      return NextResponse.json(members);
    }

    const limit = parseInt(searchParams.get('limit') || '10', 10);

    let sql = `
      SELECT 
        id, phone, name, dishes, notes, status,
        pickup_time AS pickupTime, 
        created_at AS orderTime 
      FROM orders 
    `;
    const params: any[] = [];

    if (date) {
      sql += ` WHERE date(created_at) = ? `;
      params.push(date);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? `;
    params.push(limit);

    const orders = await queryD1(sql, params);
    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('Fetch Orders Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { id, status, pickupTime } = body;

    if (!id) {
      return NextResponse.json({ error: 'Order ID or Member info required' }, { status: 400 });
    }

    // 更新订单状态和取餐时间
    await queryD1(
      'UPDATE orders SET status = ?, pickup_time = ? WHERE id = ?',
      [status, pickupTime, id]
    );

    // 如果状态切换为 confirmed，触发短信通知
    if (status === 'confirmed') {
      // 先查询订单详情以获取姓名和电话
      const results = await queryD1('SELECT name, phone FROM orders WHERE id = ?', [id]);
      const order = results[0];

      if (order) {
        const msg = `Hi ${order.name}, your order at Camden RSL is confirmed! Pickup time: ${pickupTime}. See you then!`;
        
        const formattedPhone = formatAUPhone(order.phone);
        console.log(`[SMS] Original phone: ${order.phone}, Formatted phone: ${formattedPhone}`);
        
        try {
          await sendSMS(formattedPhone, msg);
        } catch (err: any) {
          // 如果短信失败，我们在这里记录，但不要让整个接口崩掉，否则前端会以为订单更新也失败了
          console.error('[Route POST] SMS trigger failed for order:', id, 'Reason:', err.message);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update Order Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}