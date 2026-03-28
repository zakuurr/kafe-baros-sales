import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { OperationalCost } from '../types';
import { Plus, Edit2, Trash2, X, Check, Loader2, Wallet } from 'lucide-react';
import { format } from 'date-fns';

export const OperationalCosts: React.FC = () => {
  const [costs, setCosts] = useState<OperationalCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<OperationalCost | null>(null);
  
  const [formData, setFormData] = useState({
    keterangan: '',
    nominal: '',
    tanggal: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'operational_costs'), 
      where('user_id', '==', auth.currentUser.uid),
      orderBy('tanggal', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const costData: OperationalCost[] = [];
      snapshot.forEach((doc) => {
        costData.push({ id: doc.id, ...doc.data() } as OperationalCost);
      });
      setCosts(costData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching operational costs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const data = {
      user_id: auth.currentUser.uid,
      keterangan: formData.keterangan,
      nominal: Number(formData.nominal),
      tanggal: formData.tanggal,
      createdAt: Timestamp.now()
    };

    try {
      if (editingCost) {
        await updateDoc(doc(db, 'operational_costs', editingCost.id!), {
          keterangan: data.keterangan,
          nominal: data.nominal,
          tanggal: data.tanggal
        });
      } else {
        await addDoc(collection(db, 'operational_costs'), data);
      }
      setIsModalOpen(false);
      setEditingCost(null);
      setFormData({ 
        keterangan: '', 
        nominal: '', 
        tanggal: format(new Date(), 'yyyy-MM-dd') 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, editingCost ? `operational_costs/${editingCost.id}` : 'operational_costs');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'operational_costs', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `operational_costs/${id}`);
    }
  };

  const openEditModal = (cost: OperationalCost) => {
    setEditingCost(cost);
    setFormData({
      keterangan: cost.keterangan,
      nominal: cost.nominal.toString(),
      tanggal: cost.tanggal
    });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Biaya Operasional
        </h2>
        <button
          onClick={() => {
            setEditingCost(null);
            setFormData({ 
              keterangan: '', 
              nominal: '', 
              tanggal: format(new Date(), 'yyyy-MM-dd') 
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Biaya
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 font-semibold text-gray-600">Tanggal</th>
                <th className="p-4 font-semibold text-gray-600">Keterangan</th>
                <th className="p-4 font-semibold text-gray-600">Nominal</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {costs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Belum ada data biaya operasional.
                  </td>
                </tr>
              ) : (
                costs.map((cost) => (
                  <tr key={cost.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-800 font-medium">{format(new Date(cost.tanggal), 'dd MMM yyyy')}</td>
                    <td className="p-4 text-gray-600">{cost.keterangan}</td>
                    <td className="p-4 text-red-600 font-bold">Rp {cost.nominal.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(cost)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cost.id!)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">
                {editingCost ? 'Edit Biaya Operasional' : 'Tambah Biaya Operasional'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  required
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Contoh: Tisu, Gaji"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal</label>
                <input
                  type="number"
                  required
                  value={formData.nominal}
                  onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
