import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from 'recharts';
import { useSettings } from '../contexts/SettingsContext';

export default function MasterReport() {
  const { settings } = useSettings();

  // Mock data representing intelligent synthesis
  const data = useMemo(() => [
    { category: 'Alimentos', revenue: 45000, margin: 15, growth: 12 },
    { category: 'Bebidas', revenue: 32000, margin: 18, growth: -5 },
    { category: 'Higiene', revenue: 28000, margin: 22, growth: 25 },
    { category: 'Limpeza', revenue: 19000, margin: 20, growth: 8 },
  ], []);

  const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        {data.map((item, index) => (
          <div key={item.category} className="p-3 bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest truncate">{item.category}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(item.revenue)}
              </span>
              <span className={`text-[10px] font-bold ${item.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {item.growth > 0 ? '+' : ''}{item.growth}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={settings.theme === 'dark' ? '#27272a' : '#f1f5f9'} />
            <XAxis 
              dataKey="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 900, fill: settings.theme === 'dark' ? '#71717a' : '#94a3b8' }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 900, fill: settings.theme === 'dark' ? '#71717a' : '#94a3b8' }} 
            />
            <Tooltip 
              cursor={{ fill: settings.theme === 'dark' ? '#18181b' : '#f8fafc' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                backgroundColor: settings.theme === 'dark' ? '#18181b' : '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            />
            <Bar dataKey="revenue" radius={[10, 10, 0, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
