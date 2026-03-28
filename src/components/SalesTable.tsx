import React, { useState } from 'react';
import { SalesRecord, Product } from '../types';
import { Search, Plus, Edit2, Trash2, X, Check, Filter, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface SalesTableProps {
  sales: SalesRecord[];
  products: Product[];
  onAdd: (data: Omit<SalesRecord, 'id' | 'user_id' | 'createdAt'>) => void;
  onUpdate: (id: string, data: Partial<SalesRecord>) => void;
  onDelete: (id: string) => void;
  currentUserId: string;
  isAdmin: boolean;
}

export default function SalesTable({ sales, products, onAdd, onUpdate, onDelete, currentUserId, isAdmin }: SalesTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [formData, setFormData] = useState({
    nama_menu: '',
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    harga_jual: 0,
    hpp: 0,
    jumlah_terjual: 0,
    note: ''
  });

  const filteredSales = sales
    .filter(s => 
      s.nama_menu.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterDate === '' || s.tanggal === filterDate)
    )
    .sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime();
      const dateB = new Date(b.tanggal).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(editingId, formData);
      setEditingId(null);
    } else {
      onAdd(formData);
      setIsAdding(false);
    }
    setFormData({
      nama_menu: '',
      tanggal: format(new Date(), 'yyyy-MM-dd'),
      harga_jual: 0,
      hpp: 0,
      jumlah_terjual: 0,
      note: ''
    });
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMenu = e.target.value;
    const product = products.find(p => p.nama_menu === selectedMenu);
    if (product) {
      setFormData({
        ...formData,
        nama_menu: product.nama_menu,
        harga_jual: product.harga_jual,
        hpp: product.hpp
      });
    } else {
      setFormData({
        ...formData,
        nama_menu: '',
        harga_jual: 0,
        hpp: 0
      });
    }
  };

  const startEdit = (sale: SalesRecord) => {
    setEditingId(sale.id!);
    setFormData({
      nama_menu: sale.nama_menu,
      tanggal: sale.tanggal,
      harga_jual: sale.harga_jual,
      hpp: sale.hpp,
      jumlah_terjual: sale.jumlah_terjual,
      note: sale.note || ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-1 gap-4 w-full md:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
        
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Sale
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900">{editingId ? 'Edit Sale' : 'Add New Sale'}</h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pilih Menu</label>
              <select
                required
                value={formData.nama_menu}
                onChange={handleProductChange}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Menu --</option>
                {products.map(p => (
                  <option key={p.id} value={p.nama_menu}>{p.nama_menu}</option>
                ))}
              </select>
              {products.length === 0 && (
                <p className="text-[10px] text-orange-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Belum ada menu. Tambah di tab "Data Menu".
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal</label>
              <input
                required
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Jumlah Terjual</label>
              <input
                required
                type="number"
                min="1"
                value={formData.jumlah_terjual || ''}
                onChange={(e) => setFormData({ ...formData, jumlah_terjual: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Harga Jual (Auto)</label>
              <div className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-gray-600">
                Rp {formData.harga_jual.toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">HPP (Auto)</label>
              <div className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-gray-600">
                Rp {formData.hpp.toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Profit (Est)</label>
              <div className="w-full px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 font-bold">
                Rp {((formData.harga_jual - formData.hpp) * formData.jumlah_terjual).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2 md:col-span-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Note (Optional)</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                placeholder="Add some notes..."
              />
            </div>
            <div className="flex items-end md:col-span-3">
              <button
                type="submit"
                disabled={!formData.nama_menu || formData.jumlah_terjual <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                <Check className="w-5 h-5" />
                {editingId ? 'Update Penjualan' : 'Simpan Penjualan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Menu</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                  Tanggal {sortOrder === 'asc' ? '↑' : '↓'}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Harga</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">HPP</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Note</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Margin</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-gray-900">{sale.nama_menu}</td>
                  <td className="px-6 py-4 text-gray-600">{format(new Date(sale.tanggal), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-gray-600">Rp {sale.harga_jual.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-600">Rp {sale.hpp.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-900 font-semibold">{sale.jumlah_terjual}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm italic max-w-[200px] truncate" title={sale.note}>{sale.note || '-'}</td>
                  <td className="px-6 py-4 text-green-600 font-medium">Rp {sale.margin_per_cup.toLocaleString()}</td>
                  <td className="px-6 py-4 text-blue-600 font-bold">Rp {sale.total_profit.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    {(isAdmin || sale.user_id === currentUserId) && (
                      <div className="flex justify-end gap-2 transition-opacity">
                        <button
                          onClick={() => startEdit(sale)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(sale.id!)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No sales data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
