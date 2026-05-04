/**
 * Orders API Route
 * Handles order listing and updates.
 */
import { NextRequest, NextResponse } from 'next/server';
import { queryD1 } from '@/googleSheet';

export const dynamic = 'force-dynamic';

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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update Order Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}