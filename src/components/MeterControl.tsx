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
import { MeterRecord } from '../types';
import { Plus, Edit2, Trash2, X, Check, Loader2, Gauge } from 'lucide-react';
import { format } from 'date-fns';

export const MeterControl: React.FC = () => {
  const [records, setRecords] = useState<MeterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MeterRecord | null>(null);
  
  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    meter_awal: '',
    meter_akhir: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'meter_records'), 
      where('user_id', '==', auth.currentUser.uid),
      orderBy('tanggal', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordData: MeterRecord[] = [];
      snapshot.forEach((doc) => {
        recordData.push({ id: doc.id, ...doc.data() } as MeterRecord);
      });
      setRecords(recordData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching meter records:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const meter_awal = Number(formData.meter_awal);
    const meter_akhir = Number(formData.meter_akhir);
    const total_pemakaian = meter_akhir - meter_awal;

    const data = {
      user_id: auth.currentUser.uid,
      tanggal: formData.tanggal,
      meter_awal,
      meter_akhir,
      total_pemakaian,
      createdAt: Timestamp.now()
    };

    try {
      if (editingRecord) {
        await updateDoc(doc(db, 'meter_records', editingRecord.id!), {
          tanggal: data.tanggal,
          meter_awal: data.meter_awal,
          meter_akhir: data.meter_akhir,
          total_pemakaian: data.total_pemakaian
        });
      } else {
        await addDoc(collection(db, 'meter_records'), data);
      }
      setIsModalOpen(false);
      setEditingRecord(null);
      setFormData({ 
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        meter_awal: '',
        meter_akhir: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, editingRecord ? `meter_records/${editingRecord.id}` : 'meter_records');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'meter_records', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `meter_records/${id}`);
    }
  };

  const openEditModal = (record: MeterRecord) => {
    setEditingRecord(record);
    setFormData({
      tanggal: record.tanggal,
      meter_awal: record.meter_awal.toString(),
      meter_akhir: record.meter_akhir.toString()
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
          <Gauge className="w-5 h-5" />
          Kontrol Meteran
        </h2>
        <button
          onClick={() => {
            setEditingRecord(null);
            setFormData({ 
              tanggal: format(new Date(), 'yyyy-MM-dd'),
              meter_awal: '',
              meter_akhir: ''
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Data
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 font-semibold text-gray-600">Tanggal</th>
                <th className="p-4 font-semibold text-gray-600">Meter Awal</th>
                <th className="p-4 font-semibold text-gray-600">Meter Akhir</th>
                <th className="p-4 font-semibold text-gray-600">Total Pemakaian (m³)</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Belum ada data meteran.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-800 font-medium">{format(new Date(record.tanggal), 'dd MMM yyyy')}</td>
                    <td className="p-4 text-gray-600">{record.meter_awal.toLocaleString()}</td>
                    <td className="p-4 text-gray-600">{record.meter_akhir.toLocaleString()}</td>
                    <td className="p-4 text-blue-600 font-bold">{record.total_pemakaian.toLocaleString()} m³</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(record)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id!)}
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
                {editingRecord ? 'Edit Data Meter' : 'Tambah Data Meter'}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meter Awal</label>
                  <input
                    type="number"
                    required
                    value={formData.meter_awal}
                    onChange={(e) => setFormData({ ...formData, meter_awal: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meter Akhir</label>
                  <input
                    type="number"
                    required
                    value={formData.meter_akhir}
                    onChange={(e) => setFormData({ ...formData, meter_akhir: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">
                  Total Pemakaian: {Math.max(0, Number(formData.meter_akhir) - Number(formData.meter_awal))} m³
                </p>
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
