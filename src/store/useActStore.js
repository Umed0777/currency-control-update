import { create } from "zustand";
import {
  getActsByInvoice,
  createAct,
  updateAct,
  deleteAct,
} from "../api/act.service";

export const useActStore = create((set, get) => ({
  acts: [],
  isLoading: false,
  error: null,

  // 1. Загрузка списка актов для инвойса
  fetchActsByInvoice: async (branchId, companyId, contractId, invoiceId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getActsByInvoice(branchId, companyId, contractId, invoiceId);
      // Бэкенд может вернуть массив напрямую или в объекте { results: [...] }
      const actsList = Array.isArray(data) ? data : data?.results || [];
      set({ acts: actsList, isLoading: false });
    } catch (err) {
      console.error("Ошибка загрузки актов:", err);
      set({
        error: err?.response?.data?.error || "Не удалось загрузить акты",
        isLoading: false,
      });
    }
  },

  // 2. Создание акта
  createAct: async (branchId, companyId, contractId, invoiceId, formData) => {
    set({ isLoading: true, error: null });
    try {
      const newAct = await createAct(branchId, companyId, contractId, invoiceId, formData);
      set((state) => ({ 
        acts: [newAct, ...state.acts], 
        isLoading: false 
      }));
      return newAct;
    } catch (err) {
      console.error("Ошибка создания акта:", err);
      set({
        error: err?.response?.data?.error || "Не удалось создать акт",
        isLoading: false,
      });
      throw err;
    }
  },

  // 3. Обновление акта
  updateAct: async (branchId, companyId, contractId, actId, formData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAct = await updateAct(branchId, companyId, contractId, actId, formData);
      set((state) => ({
        acts: state.acts.map((a) => (a.id === actId ? { ...a, ...updatedAct } : a)),
        isLoading: false,
      }));
      return updatedAct;
    } catch (err) {
      console.error("Ошибка обновления акта:", err);
      set({
        error: err?.response?.data?.error || "Не удалось обновить акт",
        isLoading: false,
      });
      throw err;
    }
  },

  // 4. Удаление акта (в корзину)
  deleteAct: async (branchId, companyId, contractId, actId) => {
    set({ isLoading: true, error: null });
    try {
      await deleteAct(branchId, companyId, contractId, actId);
      set((state) => ({
        acts: state.acts.filter((a) => a.id !== actId),
        isLoading: false,
      }));
    } catch (err) {
      console.error("Ошибка удаления акта:", err);
      set({
        error: err?.response?.data?.error || "Не удалось удалить акт",
        isLoading: false,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));