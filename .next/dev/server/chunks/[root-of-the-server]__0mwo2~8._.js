module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/Desktop/orderbot_t/googleSheet.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "queryD1",
    ()=>queryD1
]);
/**
 * Cloudflare D1 Database Client
 * Refactored from Google Sheets for production scalability.
 */ // 从环境变量中读取配置
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_DATABASE_ID = process.env.CF_DATABASE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const queryD1 = async (sql, params = [])=>{
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DATABASE_ID}/query`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sql,
            params
        })
    });
    const data = await response.json();
    if (!data.success) {
        console.error('[D1 Error]', data.errors);
        throw new Error(data.errors?.[0]?.message || 'Database query failed');
    }
    // D1 query API 返回的是结果数组
    return data.result[0].results;
};
}),
"[project]/Desktop/orderbot_t/app/api/orders/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST,
    "dynamic",
    ()=>dynamic
]);
/**
 * Orders API Route
 * Handles order listing and updates.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/orderbot_t/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$googleSheet$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/orderbot_t/googleSheet.ts [app-route] (ecmascript)");
;
;
const dynamic = 'force-dynamic';
async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const date = searchParams.get('date');
        // 整合统计逻辑 (用于图表和总计)
        if (type === 'stats') {
            // 获取全表总行数 (不分日期)
            const totalCountResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$googleSheet$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["queryD1"])('SELECT COUNT(*) as count FROM orders');
            const totalOrders = totalCountResult[0].count;
            // 获取每日订单分布 (最近 14 天)
            const dailyStats = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$googleSheet$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["queryD1"])(`
        SELECT date(created_at) as date, COUNT(*) as count 
        FROM orders 
        GROUP BY date 
        ORDER BY date DESC 
        LIMIT 14
      `);
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                totalOrders,
                dailyStats: dailyStats.reverse()
            });
        }
        // 整合会员查询逻辑
        if (type === 'members') {
            const search = searchParams.get('search');
            let sql = 'SELECT phone, name FROM members';
            let params = [];
            if (search) {
                sql += ' WHERE name LIKE ? OR phone LIKE ?';
                params.push(`%${search}%`, `%${search}%`);
            }
            sql += ' ORDER BY name ASC';
            const members = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$googleSheet$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["queryD1"])(sql, params);
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(members);
        }
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        let sql = `
      SELECT 
        id, phone, name, dishes, notes, status,
        pickup_time AS pickupTime, 
        created_at AS orderTime 
      FROM orders 
    `;
        const params = [];
        if (date) {
            sql += ` WHERE date(created_at) = ? `;
            params.push(date);
        }
        sql += ` ORDER BY created_at DESC LIMIT ? `;
        params.push(limit);
        const orders = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$googleSheet$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["queryD1"])(sql, params);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(orders);
    } catch (error) {
        console.error('Fetch Orders Error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message
        }, {
            status: 500
        });
    }
}
async function POST(req) {
    try {
        const body = await req.json();
        // 整合会员录入逻辑
        if (body.phone && body.name && !body.id) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$googleSheet$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["queryD1"])(`INSERT INTO members (phone, name) VALUES (?, ?) 
         ON CONFLICT(phone) DO UPDATE SET name = excluded.name`, [
                body.phone.trim(),
                body.name.trim()
            ]);
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true
            });
        }
        const { id, status, pickupTime } = body;
        if (!id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Order ID or Member info required'
            }, {
                status: 400
            });
        }
        // 更新订单状态和取餐时间
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$googleSheet$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["queryD1"])('UPDATE orders SET status = ?, pickup_time = ? WHERE id = ?', [
            status,
            pickupTime,
            id
        ]);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true
        });
    } catch (error) {
        console.error('Update Order Error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$orderbot_t$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0mwo2~8._.js.map