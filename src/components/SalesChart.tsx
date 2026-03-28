import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { SalesRecord } from '../types';
import { format, parseISO } from 'date-fns';

interface SalesChartProps {
  sales: SalesRecord[];
}

export default function SalesChart({ sales }: SalesChartProps) {
  // Group sales by month for the last 6 months
  const data = sales.reduce((acc: any[], sale) => {
    const month = format(parseISO(sale.tanggal), 'MMM yyyy');
    const existing = acc.find(d => d.month === month);
    if (existing) {
      existing.profit += sale.total_profit;
      existing.revenue += sale.harga_jual * sale.jumlah_terjual;
    } else {
      acc.push({ month, profit: sale.total_profit, revenue: sale.harga_jual * sale.jumlah_terjual });
    }
    return acc;
  }, []).reverse();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-100">
          <p className="font-bold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600 flex justify-between gap-4">
              <span>Revenue:</span>
              <span className="font-bold">Rp {payload[0].value?.toLocaleString()}</span>
            </p>
            <p className="text-sm text-green-600 flex justify-between gap-4">
              <span>Profit:</span>
              <span className="font-bold">Rp {payload[1].value?.toLocaleString()}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis 
          dataKey="month" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          dy={10}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          tickFormatter={(value) => `Rp ${value / 1000}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="revenue" 
          stroke="#3b82f6" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorRevenue)" 
        />
        <Area 
          type="monotone" 
          dataKey="profit" 
          stroke="#10b981" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorProfit)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
