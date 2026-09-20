import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations, TranslationKey } from '../i18n/translations';

interface LanguageStoreState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const memoryStorage = new Map<string, string>();

const safeStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (typeof window === 'undefined' && typeof (globalThis as any).nativeCallSyncHook === 'undefined') {
        return memoryStorage.get(name) || null;
      }
      return await AsyncStorage.getItem(name);
    } catch {
      return memoryStorage.get(name) || null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (typeof window === 'undefined' && typeof (globalThis as any).nativeCallSyncHook === 'undefined') {
        memoryStorage.set(name, value);
        return;
      }
      await AsyncStorage.setItem(name, value);
    } catch {
      memoryStorage.set(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      if (typeof window === 'undefined' && typeof (globalThis as any).nativeCallSyncHook === 'undefined') {
        memoryStorage.delete(name);
        return;
      }
      await AsyncStorage.removeItem(name);
    } catch {
      memoryStorage.delete(name);
    }
  },
};

export const useLanguageStore = create<LanguageStoreState>()(
  persist(
    (set, get) => ({
      language: 'vi', // Default to Vietnamese as requested
      setLanguage: (language) => set({ language }),
      toggleLanguage: () => set({ language: get().language === 'vi' ? 'en' : 'vi' }),
    }),
    {
      name: 'vku-language-preference',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

/**
 * Fast translation hook
 */
export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const toggleLanguage = useLanguageStore((state) => state.toggleLanguage);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return { t, language, setLanguage, toggleLanguage };
}
