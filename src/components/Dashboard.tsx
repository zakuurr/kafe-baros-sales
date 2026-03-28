import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, Timestamp, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { UserProfile, SalesRecord, Product, MeterRecord, Settings, OperationalCost } from '../types';
import SalesTable from './SalesTable';
import SalesChart from './SalesChart';
import Recap from './Recap';
import { ProductManager } from './ProductManager';
import { MeterControl } from './MeterControl';
import { WaterSettings } from './WaterSettings';
import { OperationalCosts } from './OperationalCosts';
import { LogOut, LayoutDashboard, Table, BarChart3, TrendingUp, User, Package, Gauge, Droplets, Wallet } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardProps {
  profile: UserProfile;
  onLogout: () => void;
}

export default function Dashboard({ profile, onLogout }: DashboardProps) {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [meterRecords, setMeterRecords] = useState<MeterRecord[]>([]);
  const [operationalCosts, setOperationalCosts] = useState<OperationalCost[]>([]);
  const [waterSettings, setWaterSettings] = useState<Settings | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'data' | 'recap' | 'meter' | 'water' | 'costs'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile.uid) return;

    // Fetch Products
    const qProducts = query(
      collection(db, 'products'), 
      where('user_id', '==', profile.uid),
      orderBy('nama_menu', 'asc')
    );
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    // Fetch Sales
    const qSales = query(
      collection(db, 'penjualan'), 
      where('user_id', '==', profile.uid),
      orderBy('tanggal', 'desc')
    );
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesRecord)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'penjualan'));

    // Fetch Meter Records (for admin_galon)
    let unsubMeter = () => {};
    if (profile.role === 'admin_galon') {
      const qMeter = query(
        collection(db, 'meter_records'), 
        where('user_id', '==', profile.uid),
        orderBy('tanggal', 'desc')
      );
      unsubMeter = onSnapshot(qMeter, (snapshot) => {
        setMeterRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeterRecord)));
      });
    }

    // Fetch Operational Costs
    const qCosts = query(
      collection(db, 'operational_costs'), 
      where('user_id', '==', profile.uid),
      orderBy('tanggal', 'desc')
    );
    const unsubCosts = onSnapshot(qCosts, (snapshot) => {
      setOperationalCosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OperationalCost)));
    });

    // Fetch Water Settings (for admin_galon)
    let unsubSettings = () => {};
    if (profile.role === 'admin_galon') {
      unsubSettings = onSnapshot(doc(db, 'settings', profile.uid), (doc) => {
        if (doc.exists()) {
          setWaterSettings(doc.data() as Settings);
        }
      });
    }

    return () => {
      unsubProducts();
      unsubSales();
      unsubMeter();
      unsubCosts();
      unsubSettings();
    };
  }, [profile.uid, profile.role]);

  const handleAddSale = async (data: Omit<SalesRecord, 'id' | 'user_id' | 'createdAt'>) => {
    try {
      const margin_per_cup = data.harga_jual - data.hpp;
      const total_profit = margin_per_cup * data.jumlah_terjual;
      
      await addDoc(collection(db, 'penjualan'), {
        ...data,
        user_id: profile.uid,
        margin_per_cup,
        total_profit,
        createdAt: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'penjualan');
    }
  };

  const handleUpdateSale = async (id: string, data: Partial<SalesRecord>) => {
    try {
      const docRef = doc(db, 'penjualan', id);
      const updateData = { ...data };
      
      if (data.harga_jual !== undefined || data.hpp !== undefined || data.jumlah_terjual !== undefined) {
        // Recalculate if needed
        const current = sales.find(s => s.id === id);
        if (current) {
          const harga = data.harga_jual ?? current.harga_jual;
          const hpp = data.hpp ?? current.hpp;
          const qty = data.jumlah_terjual ?? current.jumlah_terjual;
          updateData.margin_per_cup = harga - hpp;
          updateData.total_profit = updateData.margin_per_cup * qty;
        }
      }
      
      await updateDoc(docRef, updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `penjualan/${id}`);
    }
  };

  const handleDeleteSale = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'penjualan', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `penjualan/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
              SM
            </div>
            <span className="font-bold text-xl text-gray-900">Kafe Baros</span>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm text-gray-900 truncate">{profile.name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{profile.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'overview' ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'data' ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Table className="w-5 h-5" />
            {profile.role === 'admin_galon' ? 'Kasir' : 'Data Penjualan'}
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'menu' ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Package className="w-5 h-5" />
            {profile.role === 'admin_galon' ? 'Produk' : 'Data Menu'}
          </button>

          {profile.role === 'admin_galon' && (
            <>
              <button
                onClick={() => setActiveTab('meter')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  activeTab === 'meter' ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <Gauge className="w-5 h-5" />
                Kontrol Meteran
              </button>
              <button
                onClick={() => setActiveTab('water')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  activeTab === 'water' ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <Droplets className="w-5 h-5" />
                Harga Air per m³
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('recap')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'recap' ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <BarChart3 className="w-5 h-5" />
            Rekap
          </button>

          <button
            onClick={() => setActiveTab('costs')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'costs' ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Wallet className="w-5 h-5" />
            Biaya Operasional
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            {activeTab === 'overview' ? 'Dashboard Overview' : 
             activeTab === 'menu' ? (profile.role === 'admin_galon' ? 'Produk' : 'Data Menu') : 
             activeTab === 'data' ? (profile.role === 'admin_galon' ? 'Kasir' : 'Data Penjualan') : 
             activeTab === 'meter' ? 'Kontrol Meteran' :
             activeTab === 'water' ? 'Harga Air per m³' :
             activeTab === 'costs' ? 'Biaya Operasional' :
             'Sales Recap'}
          </h2>
          <p className="text-gray-500">Manage and monitor your business sales effectively.</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-8">
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Rp {sales.reduce((acc, s) => acc + (s.harga_jual * s.jumlah_terjual), 0).toLocaleString()}
                    </h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Total Profit</p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Rp {sales.reduce((acc, s) => acc + s.total_profit, 0).toLocaleString()}
                    </h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <Table className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Items Sold</p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {sales.reduce((acc, s) => acc + s.jumlah_terjual, 0).toLocaleString()} Units
                    </h3>
                  </div>
                </div>

                {profile.role === 'admin_galon' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                          <Gauge className="w-6 h-6" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">Total Pemakaian Air</p>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {meterRecords.reduce((acc, r) => acc + r.total_pemakaian, 0).toLocaleString()} m³
                      </h3>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600">
                          <Droplets className="w-6 h-6" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">Estimasi Biaya Air</p>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Rp {(meterRecords.reduce((acc, r) => acc + r.total_pemakaian, 0) * (waterSettings?.harga_air_per_m3 || 0)).toLocaleString()}
                      </h3>
                    </div>
                  </div>
                )}

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Monthly Sales Trend</h3>
                  <div className="h-80">
                    <SalesChart sales={sales} />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'menu' && (
              <ProductManager />
            )}

            {activeTab === 'meter' && (
              <MeterControl />
            )}

            {activeTab === 'water' && (
              <WaterSettings />
            )}

            {activeTab === 'data' && (
              <SalesTable 
                sales={sales} 
                products={products}
                onAdd={handleAddSale} 
                onUpdate={handleUpdateSale} 
                onDelete={handleDeleteSale} 
                currentUserId={profile.uid}
                isAdmin={profile.role === 'admin_kedai' || profile.role === 'admin_galon'}
              />
            )}

            {activeTab === 'recap' && (
              <Recap sales={sales} meterRecords={meterRecords} operationalCosts={operationalCosts} waterPrice={waterSettings?.harga_air_per_m3 || 0} role={profile.role} userName={profile.name} />
            )}

            {activeTab === 'costs' && (
              <OperationalCosts />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
