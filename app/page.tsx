'use client';

import React, { useEffect, useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { 
  Clock, Phone, Loader2, Utensils, ChevronRight, Lock, LogIn,
  ChefHat, Calendar, PlusCircle, LayoutDashboard, Users, ListFilter, Edit2, Search, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 样式合并工具
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 时间计算工具
const addMinutesToTime = (time: string | null, mins: number) => {
  try {
    let h: number, m: number;
    const normalizedTime = (time || '').toUpperCase();
    
    // 如果传入 0 或者当前是 ASAP/空，则取当前真实时间
    if (mins === 0 || !time || normalizedTime === 'ASAP') {
      const now = new Date();
      // 使用悉尼时间或本地时间
      h = now.getHours();
      m = now.getMinutes();
    } else {
      const parts = time.split(':');
      [h, m] = parts.length === 2 ? parts.map(Number) : [new Date().getHours(), new Date().getMinutes()];
    }
    const date = new Date();
    date.setHours(h, m + mins);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } catch {
    return time;
  }
};

const TRANSLATIONS = {
  zh: {
    recent: '实时订单', stats: '综合统计', members: '会员管理', latest: '最新订单',
    limit: '显示数量', items: '条', customer: '客户', orderAt: '下单时间',
    details: '详情/备注', pickup: '预计取餐', action: '状态控制', total: '累计流水',
    traffic: '今日客流量', membersCount: '会员总量', addMember: '录入新会员',
    name: '姓名', phone: '电话号码', save: '保存至云端', list: '全量会员名录',
    search: '快速查询...', date: '选择日期', cancel: '取消', notes: '备注',
    received: '待确认', confirmed: '制作中', ready: '可取餐', finished: '已完成',
    loginTitle: '系统身份验证', loginSub: '请输入管理凭证以访问 Hub',
    username: '用户名', password: '密码', loginBtn: '登录系统', loginError: '账号或密码错误'
  },
  en: {
    recent: 'Orders', stats: 'Dashboard', members: 'Members', latest: 'Latest Orders',
    limit: 'Limit', items: 'Items', customer: 'Customer', orderAt: 'Order At',
    details: 'Details/Notes', pickup: 'Pickup Time', action: 'Status', total: 'Total Orders',
    traffic: 'Traffic Today', membersCount: 'Total Members', addMember: 'Add Member',
    name: 'Name', phone: 'Phone', save: 'Save to Cloud', list: 'Member List',
    search: 'Search...', date: 'Date', cancel: 'Cancel', notes: 'Notes',
    received: 'Pending', confirmed: 'Cooking', ready: 'Ready', finished: 'Finished',
    loginTitle: 'Authentication', loginSub: 'Please enter credentials to access Hub',
    username: 'Username', password: 'Password', loginBtn: 'Login', loginError: 'Invalid credentials'
  }
};

// 状态配置流
const STATUS_FLOW: Record<string, { zh: string; en: string; color: string; next: string | null }> = {
  'received': { zh: '待确认', en: 'Pending', color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100', next: 'confirmed' },
  'confirmed': { zh: '制作中', en: 'Cooking', color: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100', next: 'ready' },
  'ready': { zh: '可取餐', en: 'Ready', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100', next: 'finished' },
  'finished': { zh: '已完成', en: 'Finished', color: 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed', next: null },
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function OrderManagementPage() {
  const [activeTab, setActiveTab] = useState<'recent' | 'stats' | 'members'>('recent');
  const [limit, setLimit] = useState(10);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMsg, setLoginMsg] = useState('');

  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [newMember, setNewMember] = useState({ phone: '', name: '' });
  const [editingTimeId, setEditingTimeId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const t = TRANSLATIONS[lang];
  
  const ordersKey = `/api/orders?limit=${activeTab === 'stats' ? 1000 : limit}&date=${selectedDate}`;
  const { data: orders, isLoading } = useSWR(ordersKey, fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });
  
  // 获取全局统计数据 (总数和趋势图)
  const { data: globalStats } = useSWR('/api/orders?type=stats', fetcher, {
    refreshInterval: 30000, // 统计数据无需过高频更新
  });

  // 会员查询 API 路径更新
  const membersKey = `/api/orders?type=members${memberSearch ? `&search=${memberSearch}` : ''}`;
  const { data: members, mutate: mutateMembers } = useSWR(membersKey, fetcher);

  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const ordersArray = Array.isArray(orders) ? orders : [];
    return {
      total: globalStats?.totalOrders || 0, // 修正：显示数据库总行数
      today: ordersArray.filter((o: any) => new Date(o.orderTime).toDateString() === new Date().toDateString()).length,
      membersCount: Array.isArray(members) ? members.length : 0
    };
  }, [orders, members, globalStats]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      if (res.ok) {
        // 设置 4 小时过期时间 (4 * 60 * 60 * 1000 毫秒)
        const expiry = new Date().getTime() + 4 * 60 * 60 * 1000;
        localStorage.setItem('orderbot_auth', JSON.stringify({ expiry }));
        setIsLoggedIn(true);
      } else {
        setLoginMsg(t.loginError);
      }
    } catch (e) {
      setLoginMsg('Server error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    // 会员录入 API 路径更新
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMember),
    });
    if (res.ok) {
      setNewMember({ phone: '', name: '' });
      mutateMembers();
    }
  };

  const handleUpdateOrder = async (order: any, updates: { status?: string, pickupTime?: string | null }) => {
    setIsUpdating(order.id);
    const payload = {
      id: order.id,
      status: updates.status || order.status,
      pickupTime: updates.pickupTime || order.pickupTime
    };

    try {
      // 乐观更新
      const updatedOrders = orders.map((o: any) => o.id === order.id ? { ...o, ...payload } : o);
      mutate(ordersKey, updatedOrders, false);

      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } finally {
      mutate(ordersKey);
      setIsUpdating(null);
      setEditingTimeId(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 p-12">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-100 mb-6">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 mb-2">{t.loginTitle}</h1>
            <p className="text-slate-400 font-bold text-center leading-tight">{t.loginSub}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t.username}</label>
              <input type="text" required value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t.password}</label>
              <input type="password" required value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all" />
            </div>
            {loginMsg && <p className="text-rose-500 text-xs font-bold text-center">{loginMsg}</p>}
            <button disabled={loginLoading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
              {loginLoading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
              {t.loginBtn}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-10 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
              <ChefHat className="text-white" size={22} />
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase">OrderBot <span className="text-blue-600">Pro</span></h1>
          </div>

          <nav className="flex bg-slate-100 p-1.5 rounded-2xl">
            {[
              { id: 'recent', icon: ListFilter, label: t.recent },
              { id: 'stats', icon: LayoutDashboard, label: t.stats },
              { id: 'members', icon: Users, label: t.members }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-base font-bold transition-all",
                  activeTab === tab.id ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-6">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setLang('zh')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", lang === 'zh' ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600")}>中</button>
              <button onClick={() => setLang('en')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", lang === 'en' ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600")}>EN</button>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <Calendar size={20} />
              <span className="text-lg font-black tabular-nums">
                {mounted && currentTime ? currentTime.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour12: false }) : '--:--:--'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-10 py-10">
        <AnimatePresence mode="wait">
          {activeTab === 'recent' && (
            <motion.div
              key="recent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tight text-slate-400 uppercase">{t.latest}</h2>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.date}</span>
                    <input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-black text-blue-600 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.limit}</span>
                  <select 
                    value={limit} 
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-black text-blue-600 outline-none min-w-[100px]"
                  >
                    <option value={10}>{`10 ${t.items}`}</option>
                    <option value={20}>{`20 ${t.items}`}</option>
                    <option value={50}>{`50 ${t.items}`}</option>
                  </select>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/40">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-400 text-sm font-black uppercase tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-6">{t.customer}</th>
                      <th className="px-8 py-6">{t.orderAt}</th>
                      <th className="px-8 py-6">{t.details}</th>
                      <th className="px-8 py-6 text-center">{t.pickup}</th>
                      <th className="px-8 py-6 text-right">{t.action}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoading && !orders ? (
                      <tr key="loading"><td colSpan={5} className="py-32 text-center"><Loader2 className="animate-spin mx-auto text-slate-200" size={40} /></td></tr>
                    ) : Array.isArray(orders) && orders.map((order: any) => {
                      const isReceived = (order.status || '').toLowerCase() === 'received';
                      return (
                      <tr key={order.id} className="hover:bg-blue-50/20 transition-all group border-b border-slate-50 last:border-none">
                        <td className="px-8 py-10">
                          <div className="font-black text-2xl text-slate-900 tracking-tight">{order.name}</div>
                          <div className="text-sm text-slate-400 font-bold mt-1">{order.phone}</div>
                        </td>
                        <td className="px-8 py-10">
                          <div className="text-lg font-black text-slate-300 tabular-nums bg-slate-50 inline-block px-3 py-1 rounded-lg">
                            {new Date(order.orderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-8 py-10 text-xl font-bold text-slate-700 leading-tight max-w-md">
                          <div>{order.dishes}</div>
                          {order.notes && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold text-slate-400 italic">
                              <span className="text-[10px] font-black uppercase text-slate-300 mr-2">{t.notes}:</span>
                              {order.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-10 text-center relative">
                          {isReceived ? (
                            editingTimeId === order.id ? (
                              <div className="flex flex-col gap-3 bg-white p-6 rounded-[2.5rem] border-2 border-blue-100 shadow-2xl absolute z-[60] left-1/2 -translate-x-1/2 -mt-32 min-w-[340px]">
                                <div className="grid grid-cols-3 gap-3">
                                  {[5, 15, 20, 30, 60].map(m => (
                                  <button 
                                    key={m}
                                    onClick={(e) => { e.stopPropagation(); handleUpdateOrder(order, { pickupTime: addMinutesToTime(order.pickupTime, m) }); }}
                                    className="py-5 bg-blue-50 text-blue-600 rounded-2xl text-lg font-black hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                                  >+{m === 60 ? '1h' : `${m}m`}</button>
                                ))}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleUpdateOrder(order, { pickupTime: addMinutesToTime(null, 0) }); }}
                                    className="py-5 bg-rose-50 text-rose-600 rounded-2xl text-lg font-black hover:bg-rose-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                                  >
                                    <RotateCcw size={16} /> Reset
                                  </button>
                              </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingTimeId(null); }}
                                  className="w-full mt-3 py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                >{t.cancel}</button>
                              </div>
                            ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingTimeId(order.id); }}
                                className="inline-flex items-center gap-3 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all transform active:scale-95 shadow-sm"
                              >
                                <span className="text-6xl font-black tabular-nums leading-none">{order.pickupTime || '--:--'}</span>
                                <Edit2 size={18} className="opacity-40" />
                              </button>
                            )
                          ) : (
                            <span className="text-6xl font-black tabular-nums text-slate-200">
                              {order.pickupTime || '--:--'}
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-10 text-right">
                          {(() => {
                            const config = STATUS_FLOW[(order.status || '').toLowerCase()] || STATUS_FLOW['received'];
                            return (
                              <button
                                disabled={!config.next || isUpdating === order.id}
                                onClick={(e) => { e.stopPropagation(); handleUpdateOrder(order, { status: config.next! }); }}
                                className={cn(
                                  "inline-flex items-center gap-3 px-8 py-5 rounded-2xl border-2 text-lg font-black uppercase tracking-widest transition-all active:scale-90 shadow-sm min-w-[150px] justify-center",
                                  config.color,
                                  !config.next && "opacity-30 grayscale pointer-events-none"
                                )}
                              >
                                {isUpdating === order.id ? <Loader2 size={24} className="animate-spin" /> : config[lang]}
                                {config.next && <ChevronRight size={16} className="opacity-40" />}
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { label: t.total, val: stats.total, color: 'bg-blue-50 text-blue-600' },
                  { label: t.traffic, val: stats.today, color: 'bg-emerald-50 text-emerald-600' },
                  { label: t.membersCount, val: stats.membersCount, color: 'bg-amber-50 text-amber-600' }
                ].map(card => (
                  <div key={card.label} className={cn("p-12 rounded-[2.5rem] border border-transparent shadow-lg", card.color)}>
                    <div className="text-lg font-black uppercase tracking-widest opacity-60">{card.label}</div>
                    <div className="text-7xl font-black mt-6 tracking-tighter tabular-nums">{card.val}</div>
                  </div>
                ))}
              </div>

              {/* 每日订单变化折线图 */}
              <div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-xl shadow-slate-200/40">
                <div className="mb-8">
                  <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">每日订单趋势 (14D)</h3>
                </div>
                <div className="h-64 w-full relative">
                  {globalStats?.dailyStats && globalStats.dailyStats.length > 0 ? (
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                      {/* 定义渐变 */}
                      <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      
                      {(() => {
                        const data = globalStats.dailyStats;
                        if (!data || data.length === 0) return null;
                        const max = Math.max(...data.map((d: any) => d.count), 5);
                        const points = data.map((d: any, i: number) => {
                          const x = data.length > 1 ? (i / (data.length - 1)) * 1000 : 500;
                          const y = 200 - (d.count / max) * 180 - 10;
                          return { x, y, count: d.count, date: d.date };
                        });

                        const dPath = `M ${points.map((p: any) => `${p.x},${p.y}`).join(' L ')}`;
                        const areaPath = `${dPath} L 1000,200 L 0,200 Z`;

                        return (
                          <>
                            <path d={areaPath} fill="url(#lineGradient)" />
                            <path d={dPath} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            {points.map((p: any, i: number) => (
                              <g key={i} className="group/point">
                                <circle cx={p.x} cy={p.y} r="6" fill="white" stroke="#2563eb" strokeWidth="3" className="transition-all group-hover/point:r-8" />
                                <text x={p.x} y={p.y - 15} textAnchor="middle" className="text-[10px] font-black fill-slate-400 opacity-0 group-hover/point:opacity-100 transition-opacity">
                                  {p.count}
                                </text>
                                <text x={p.x} y="220" textAnchor="middle" className="text-[10px] font-bold fill-slate-300">
                                  {p.date.split('-').slice(1).join('/')}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-300 font-bold italic">
                      数据加载中或暂无统计数据...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'members' && (
            <motion.div
              key="members"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-10"
            >
              <div className="lg:col-span-1 bg-slate-50 p-12 rounded-[3rem] h-fit sticky top-32">
                <div className="flex items-center gap-4 mb-10">
                  <PlusCircle className="text-blue-600" size={32} />
                  <h2 className="text-3xl font-black tracking-tight">{t.addMember}</h2>
                </div>
                <form onSubmit={handleAddMember} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-400 uppercase ml-1 tracking-[0.2em]">{t.name}</label>
                    <input
                      type="text"
                      required
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      className="w-full bg-white border-4 border-transparent rounded-2xl px-6 py-5 text-xl font-bold focus:border-blue-500 outline-none transition-all shadow-md"
                      placeholder="输入姓名"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-400 uppercase ml-1 tracking-[0.2em]">{t.phone}</label>
                    <input
                      type="text"
                      required
                      value={newMember.phone}
                      onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                      className="w-full bg-white border-4 border-transparent rounded-2xl px-6 py-5 text-xl font-bold font-mono focus:border-blue-500 outline-none transition-all shadow-md"
                      placeholder="0400 000 000"
                    />
                  </div>
                  <button className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-slate-900 transition-all shadow-2xl shadow-blue-200 active:scale-95">
                    {t.save}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white border-2 border-slate-50 rounded-[3rem] overflow-hidden shadow-xl shadow-slate-200/40">
                <div className="px-10 py-10 border-b border-slate-50 flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-3xl">{t.list}</h3>
                    <span className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-lg font-black tabular-nums">Total: {members?.length || 0}</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                    <input 
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder={t.search}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-16 pr-6 py-5 text-xl font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                    />
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-sm text-slate-400 font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-10 py-6">{t.name}</th>
                      <th className="px-10 py-6 text-right">{t.phone}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Array.isArray(members) && members.map((m: any) => (
                      <tr key={m.phone} className="hover:bg-blue-50/20 transition-colors">
                        <td className="px-10 py-8 text-2xl font-black text-slate-900">{m.name}</td>
                        <td className="px-10 py-8 text-right font-black text-xl text-slate-400 tabular-nums font-mono">{m.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}