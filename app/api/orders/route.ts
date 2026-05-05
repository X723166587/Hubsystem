/**
 * Orders API Route
 * Handles order listing and updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryD1, sendSMS } from '@/googleSheet';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

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

    // 整合会员录入逻辑
    if (body.phone && body.name && !body.id) {
      await queryD1(
        `INSERT INTO members (phone, name) VALUES (?, ?) 
         ON CONFLICT(phone) DO UPDATE SET name = excluded.name`,
        [body.phone.trim(), body.name.trim()]
      );
      return NextResponse.json({ success: true });
    }

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
        
        // 增强手机号格式化逻辑，确保为 E.164 格式 (+国家代码+号码)
        let rawPhone = String(order.phone).replace(/\D/g, ''); // 移除所有非数字字符
        let formattedPhone = '';

        if (rawPhone.startsWith('+')) {
          formattedPhone = rawPhone; // 如果已经有 +，则认为已是 E.164 格式
        } else if (rawPhone.startsWith('0')) {
          // 澳大利亚号码通常以 0 开头，替换 0 为 +61
          formattedPhone = `+61${rawPhone.slice(1)}`;
        } else if (rawPhone.length === 9 && rawPhone.startsWith('4')) {
          // 常见澳大利亚手机号格式，缺少开头的 0，直接添加 +61
          formattedPhone = `+61${rawPhone}`;
        } else {
          // 默认添加 +61，假设所有号码都在澳大利亚，如果不是，需要更复杂的逻辑
          formattedPhone = `+61${rawPhone}`;
        }

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