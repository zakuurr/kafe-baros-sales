import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin_kedai' | 'admin_galon';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Product {
  id?: string;
  nama_menu: string;
  harga_jual: number;
  hpp: number;
  user_id: string;
  createdAt: Timestamp;
}

export interface SalesRecord {
  id?: string;
  user_id: string;
  nama_menu: string;
  tanggal: string; // YYYY-MM-DD
  harga_jual: number;
  hpp: number;
  jumlah_terjual: number;
  margin_per_cup: number;
  total_profit: number;
  note?: string;
  createdAt: Timestamp;
}

export interface MeterRecord {
  id?: string;
  user_id: string;
  tanggal: string; // YYYY-MM-DD
  meter_awal: number;
  meter_akhir: number;
  total_pemakaian: number;
  createdAt: Timestamp;
}

export interface Settings {
  id?: string;
  user_id: string;
  harga_air_per_m3: number;
  updatedAt: Timestamp;
}
