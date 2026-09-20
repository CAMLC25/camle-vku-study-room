export type AppDataMode = 'mock' | 'supabase';

interface AppConfig {
  appDataMode: AppDataMode;
  supabaseUrl: string;
  supabaseAnonKey: string;
  defaultStudentId: string;
  defaultStudentName: string;
  defaultStudentCode: string;
  holdDurationSeconds: number;
}

export const ENV: AppConfig = {
  // Default to 'mock' so the app runs without external credentials for evaluation
  appDataMode: (process.env.EXPO_PUBLIC_APP_DATA_MODE as AppDataMode) || 'mock',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vku-study-room.supabase.co',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key-vku',
  defaultStudentId: '00000000-0000-0000-0000-000000000001',
  defaultStudentName: 'Nguyen Van A',
  defaultStudentCode: '21IT001',
  holdDurationSeconds: 90,
};
