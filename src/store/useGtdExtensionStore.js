import { create } from "zustand";
import {
  extendGtd,
  updateGtdExtension,
  getGtdExtensionHistory,
} from "../api/gtdExtension.service";

export const useGtdExtensionStore = create((set) => ({
  history: [],
  isLoading: false,
  error: null,

  // 1. История продлений
  fetchHistory: async (branchId, companyId, contractId, invoiceId, gtdId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getGtdExtensionHistory(branchId, companyId, contractId, invoiceId, gtdId);
      const list = Array.isArray(data) ? data : data?.results || data?.data || [];
      set({ history: list, isLoading: false });
      return list;
    } catch (err) {
      console.error("Ошибка загрузки истории продлений:", err);
      set({
        error: err?.response?.data?.error || "Не удалось загрузить историю продлений",
        isLoading: false,
      });
      return [];
    }
  },

  // 2. Подать заявку
  extend: async (branchId, companyId, contractId, invoiceId, gtdId, formData) => {
    set({ isLoading: true, error: null });
    try {
      const created = await extendGtd(branchId, companyId, contractId, invoiceId, gtdId, formData);
      set((s) => ({ history: [created, ...s.history], isLoading: false }));
      return created;
    } catch (err) {
      console.error("Ошибка подачи заявки на продление:", err);
      set({ error: err?.response?.data?.error || "Не удалось подать заявку", isLoading: false });
      throw err;
    }
  },

  // 3. Доработка заявки
  updateExtension: async (branchId, companyId, contractId, invoiceId, gtdId, requestId, formData) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateGtdExtension(branchId, companyId, contractId, invoiceId, gtdId, requestId, formData);
      set((s) => ({
        history: s.history.map((h) => (h.id === requestId ? { ...h, ...updated } : h)),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      console.error("Ошибка обновления заявки:", err);
      set({ error: err?.response?.data?.error || "Не удалось обновить заявку", isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));