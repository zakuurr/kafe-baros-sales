import { useState } from 'react';
import { SalesRecord, MeterRecord, OperationalCost } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Download, Calendar, ArrowRight, Gauge, Droplets, FileText, MessageCircle, Wallet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RecapProps {
  sales: SalesRecord[];
  meterRecords: MeterRecord[];
  operationalCosts: OperationalCost[];
  waterPrice: number;
  role: 'admin_kedai' | 'admin_galon';
  userName: string;
}

export default function Recap({ sales, meterRecords, operationalCosts, waterPrice, role, userName }: RecapProps) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  
  const now = new Date();
  const interval = period === 'weekly' 
    ? { start: startOfWeek(now), end: endOfWeek(now) }
    : { start: startOfMonth(now), end: endOfMonth(now) };

  const filteredSales = sales.filter(s => 
    isWithinInterval(parseISO(s.tanggal), interval)
  );

  const filteredMeter = meterRecords.filter(r => 
    isWithinInterval(parseISO(r.tanggal), interval)
  );

  const filteredCosts = operationalCosts.filter(c => 
    isWithinInterval(parseISO(c.tanggal), interval)
  );

  const stats = {
    revenue: filteredSales.reduce((acc, s) => acc + (s.harga_jual * s.jumlah_terjual), 0),
    hppProduk: filteredSales.reduce((acc, s) => acc + (s.hpp * s.jumlah_terjual), 0),
    profit: filteredSales.reduce((acc, s) => acc + s.total_profit, 0),
    items: filteredSales.reduce((acc, s) => acc + s.jumlah_terjual, 0),
    waterUsed: filteredMeter.reduce((acc, r) => acc + r.total_pemakaian, 0),
    waterCost: filteredMeter.reduce((acc, r) => acc + r.total_pemakaian, 0) * waterPrice,
    operationalCost: filteredCosts.reduce((acc, c) => acc + c.nominal, 0)
  };

  const netProfit = stats.profit - (role === 'admin_galon' ? stats.waterCost : 0) - stats.operationalCost;

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Sales Sheet
    const salesData = filteredSales.map(s => ({
      'Nama Menu': s.nama_menu,
      'Tanggal': s.tanggal,
      'Harga Jual': s.harga_jual,
      'HPP': s.hpp,
      'Jumlah Terjual': s.jumlah_terjual,
      'Note': s.note || '',
      'Margin per Cup': s.margin_per_cup,
      'Total Profit': s.total_profit
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Recap');

    // Meter Sheet (if admin_galon)
    if (role === 'admin_galon') {
      const meterData = filteredMeter.map(r => ({
        'Tanggal': r.tanggal,
        'Meter Awal': r.meter_awal,
        'Meter Akhir': r.meter_akhir,
        'Total Pemakaian (m³)': r.total_pemakaian,
        'Estimasi Biaya': r.total_pemakaian * waterPrice
      }));
      const wsMeter = XLSX.utils.json_to_sheet(meterData);
      XLSX.utils.book_append_sheet(wb, wsMeter, 'Meter Recap');
    }

    XLSX.writeFile(wb, `Recap_${period}_${format(now, 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = `LAPORAN RINCI HPP: ${userName.toUpperCase()}`;
    const dateRange = `Periode: ${format(interval.start, 'yyyy-MM-dd')} s/d ${format(interval.end, 'yyyy-MM-dd')}`;

    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(dateRange, 14, 28);

    doc.setFontSize(12);
    doc.text(`Ringkasan Keuangan:`, 14, 40);
    doc.text(`- Omzet: Rp ${stats.revenue.toLocaleString()}`, 14, 48);
    doc.text(`- HPP Produk: Rp ${stats.hppProduk.toLocaleString()}`, 14, 54);
    doc.text(`- HPP Air: Rp ${stats.waterCost.toLocaleString()}`, 14, 60);
    doc.text(`- Biaya Ops: Rp ${stats.operationalCost.toLocaleString()}`, 14, 66);
    doc.setFont(undefined, 'bold');
    doc.text(`- LABA BERSIH: Rp ${netProfit.toLocaleString()}`, 14, 74);
    doc.setFont(undefined, 'normal');

    let currentY = 85;

    // Sales Table
    doc.text(`DETAIL JUAL & MODAL:`, 14, currentY);
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Menu', 'Tanggal', 'Qty', 'Revenue', 'Profit']],
      body: filteredSales.map(s => [
        s.nama_menu,
        s.tanggal,
        s.jumlah_terjual,
        (s.harga_jual * s.jumlah_terjual).toLocaleString(),
        s.total_profit.toLocaleString()
      ]),
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Operational Costs Table
    if (filteredCosts.length > 0) {
      doc.text(`DETAIL BIAYA OPERASIONAL:`, 14, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Keterangan', 'Tanggal', 'Nominal']],
        body: filteredCosts.map(c => [
          c.keterangan,
          c.tanggal,
          c.nominal.toLocaleString()
        ]),
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Meter Table
    if (role === 'admin_galon' && filteredMeter.length > 0) {
      doc.text(`DETAIL METERAN AIR:`, 14, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Tanggal', 'Meter Awal', 'Meter Akhir', 'Pemakaian']],
        body: filteredMeter.map(r => [
          r.tanggal,
          r.meter_awal,
          r.meter_akhir,
          r.total_pemakaian
        ]),
      });
    }

    doc.save(`Laporan_${userName}_${format(now, 'yyyy-MM-dd')}.pdf`);
  };

  const shareToWhatsApp = () => {
    const title = `*LAPORAN RINCI HPP: ${userName.toUpperCase()}*`;
    const dateRange = `Periode: ${format(interval.start, 'yyyy-MM-dd')} s/d ${format(interval.end, 'yyyy-MM-dd')}`;
    
    let text = `${title}\n${dateRange}\n\n`;
    text += `🔹 Omzet: Rp ${stats.revenue.toLocaleString()}\n`;
    text += `🔹 HPP Produk: Rp ${stats.hppProduk.toLocaleString()}\n`;
    text += `🔹 HPP Air: Rp ${stats.waterCost.toLocaleString()}\n`;
    text += `🔹 Biaya Ops: Rp ${stats.operationalCost.toLocaleString()}\n`;
    text += `*LABA BERSIH: Rp ${netProfit.toLocaleString()}*\n\n`;
    
    text += `*DETAIL JUAL & MODAL:*\n`;
    filteredSales.forEach(s => {
      text += `- ${s.nama_menu} (${s.jumlah_terjual}): Rp ${s.total_profit.toLocaleString()}\n`;
    });

    if (filteredCosts.length > 0) {
      text += `\n*DETAIL BIAYA OPERASIONAL:*\n`;
      filteredCosts.forEach(c => {
        text += `- ${c.keterangan} (${c.tanggal}): Rp ${c.nominal.toLocaleString()}\n`;
      });
    }

    if (role === 'admin_galon' && filteredMeter.length > 0) {
      text += `\n*DETAIL METERAN AIR:*\n`;
      filteredMeter.forEach(r => {
        text += `- ${r.tanggal}: ${r.total_pemakaian} m³\n`;
      });
    }

    const url = `https://api.whatsapp.com/send/?text=${encodeURIComponent(text)}&type=custom_url&app_absent=0`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${period === 'weekly' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${period === 'monthly' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Monthly
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={shareToWhatsApp}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Omzet</p>
          <h3 className="text-xl font-black text-gray-900">Rp {stats.revenue.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">HPP Produk</p>
          <h3 className="text-xl font-black text-orange-600">Rp {stats.hppProduk.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Biaya Ops</p>
          <h3 className="text-xl font-black text-red-600">Rp {stats.operationalCost.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Laba Bersih</p>
          <h3 className="text-xl font-black text-green-600">Rp {netProfit.toLocaleString()}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar className="w-24 h-24" />
          </div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Total Revenue</p>
          <h3 className="text-3xl font-black text-gray-900">Rp {stats.revenue.toLocaleString()}</h3>
          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
            {format(interval.start, 'dd MMM')} <ArrowRight className="w-3 h-3" /> {format(interval.end, 'dd MMM yyyy')}
          </p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Download className="w-24 h-24" />
          </div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Total Profit</p>
          <h3 className="text-3xl font-black text-green-600">Rp {stats.profit.toLocaleString()}</h3>
          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
            {format(interval.start, 'dd MMM')} <ArrowRight className="w-3 h-3" /> {format(interval.end, 'dd MMM yyyy')}
          </p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar className="w-24 h-24" />
          </div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Items Sold</p>
          <h3 className="text-3xl font-black text-blue-600">{stats.items.toLocaleString()}</h3>
          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
            {format(interval.start, 'dd MMM')} <ArrowRight className="w-3 h-3" /> {format(interval.end, 'dd MMM yyyy')}
          </p>
        </div>
      </div>

      {role === 'admin_galon' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Gauge className="w-24 h-24" />
            </div>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Total Pemakaian Air</p>
            <h3 className="text-3xl font-black text-purple-600">{stats.waterUsed.toLocaleString()} m³</h3>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Droplets className="w-24 h-24" />
            </div>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Estimasi Biaya Air</p>
            <h3 className="text-3xl font-black text-cyan-600">Rp {(stats.waterUsed * waterPrice).toLocaleString()}</h3>
          </div>
        </div>
      )}

      {filteredCosts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h4 className="font-bold text-gray-900">Operational Costs Details</h4>
            <span className="text-xs font-bold bg-red-50 text-red-600 px-3 py-1 rounded-full uppercase">
              {filteredCosts.length} Records
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Keterangan</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCosts.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{cost.keterangan}</td>
                    <td className="px-6 py-4 text-gray-600">{format(parseISO(cost.tanggal), 'dd MMM yyyy')}</td>
                    <td className="px-6 py-4 text-red-600 font-bold">Rp {cost.nominal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h4 className="font-bold text-gray-900">Sales Details</h4>
          <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">
            {filteredSales.length} Records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Menu</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Note</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{sale.nama_menu}</td>
                  <td className="px-6 py-4 text-gray-600">{format(parseISO(sale.tanggal), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs italic truncate max-w-[150px]">{sale.note || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">Rp {(sale.harga_jual * sale.jumlah_terjual).toLocaleString()}</td>
                  <td className="px-6 py-4 text-green-600 font-bold">Rp {sale.total_profit.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {role === 'admin_galon' && filteredMeter.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h4 className="font-bold text-gray-900">Meter Details</h4>
            <span className="text-xs font-bold bg-purple-50 text-purple-600 px-3 py-1 rounded-full uppercase">
              {filteredMeter.length} Records
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Meter Awal</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Meter Akhir</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pemakaian</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Biaya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMeter.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{format(parseISO(record.tanggal), 'dd MMM yyyy')}</td>
                    <td className="px-6 py-4 text-gray-600">{record.meter_awal.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-600">{record.meter_akhir.toLocaleString()}</td>
                    <td className="px-6 py-4 text-blue-600 font-bold">{record.total_pemakaian.toLocaleString()} m³</td>
                    <td className="px-6 py-4 text-cyan-600 font-bold">Rp {(record.total_pemakaian * waterPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
