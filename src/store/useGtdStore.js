import { create } from "zustand";
import {
  fetchGtdList,
  fetchGtdById,
  fetchGtdByInvoice,
  createGtd,
  updateGtd,
  deleteGtd,
  extendGtdDeadline,
  getGtdExtensionHistory,
} from "../api/gtd.service";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export const useGtdStore = create((set) => ({
  gtdList: [],
  currentGtd: null,
  isLoading: false,
  error: null,

  // ==== Продление срока ====
  extensionHistory: [],
  extensionHistoryLoading: false,
  extensionSubmitting: false,

  // ===== GET LIST (по контракту) =====
  fetchGtd: async (branchId, companyId, contractId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchGtdList(branchId, companyId, contractId);
      set({ gtdList: toArray(data), isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Не удалось загрузить список ГТД",
      });
    }
  },

  // ===== GET LIST (по инвойсу) =====
  fetchGtdByInvoice: async (branchId, companyId, contractId, invoiceId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchGtdByInvoice(
        branchId,
        companyId,
        contractId,
        invoiceId
      );
      set({ gtdList: toArray(data), isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Не удалось загрузить ГТД инвойса",
      });
    }
  },

  // ===== GET ONE =====
  fetchGtdById: async (branchId, companyId, contractId, gtdId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchGtdById(
        branchId,
        companyId,
        contractId,
        gtdId
      );
      set({ currentGtd: data, isLoading: false });
      return data;
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Не удалось загрузить карточку ГТД",
      });
      throw err;
    }
  },

  // ===== CREATE =====
  createGtd: async (branchId, companyId, contractId, invoiceId, payload) => {
    set({ isLoading: true, error: null });
    try {
      const created = await createGtd(
        branchId,
        companyId,
        contractId,
        invoiceId,
        payload
      );
      set((state) => ({
        gtdList: [created, ...state.gtdList],
        isLoading: false,
      }));
      return created;
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Не удалось создать ГТД",
      });
      throw err;
    }
  },

  // ===== UPDATE =====
  updateGtd: async (branchId, companyId, contractId, gtdId, payload) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateGtd(
        branchId,
        companyId,
        contractId,
        gtdId,
        payload
      );
      set((state) => ({
        gtdList: state.gtdList.map((item) =>
          item.id === gtdId ? { ...item, ...updated } : item
        ),
        currentGtd:
          state.currentGtd?.id === gtdId
            ? { ...state.currentGtd, ...updated }
            : state.currentGtd,
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Не удалось обновить ГТД",
      });
      throw err;
    }
  },

  // ===== DELETE =====
  deleteGtd: async (branchId, companyId, contractId, gtdId) => {
    set({ isLoading: true, error: null });
    try {
      await deleteGtd(branchId, companyId, contractId, gtdId);
      set((state) => ({
        gtdList: state.gtdList.filter((item) => item.id !== gtdId),
        isLoading: false,
      }));
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Не удалось удалить ГТД",
      });
      throw err;
    }
  },

  // ===== ПРОДЛЕНИЕ СРОКА ГТД =====
  extendGtd: async ({
    branchId,
    companyId,
    contractId,
    invoiceId,
    gtdId,
    requestedDeadline,
    document,
  }) => {
    set({ extensionSubmitting: true, error: null });
    try {
      const data = await extendGtdDeadline({
        branchId,
        companyId,
        contractId,
        invoiceId,
        gtdId,
        requestedDeadline,
        document,
      });
      return data;
    } catch (err) {
      set({
        extensionSubmitting: false,
        error:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Не удалось подать заявку на продление",
      });
      throw err;
    } finally {
      set({ extensionSubmitting: false });
    }
  },

  // ===== ИСТОРИЯ ПРОДЛЕНИЙ =====
  fetchExtensionHistory: async ({
    branchId,
    companyId,
    contractId,
    invoiceId,
    gtdId,
  }) => {
    set({ extensionHistoryLoading: true, extensionHistory: [] });
    try {
      const data = await getGtdExtensionHistory({
        branchId,
        companyId,
        contractId,
        invoiceId,
        gtdId,
      });
      set({ extensionHistory: toArray(data), extensionHistoryLoading: false });
      return data;
    } catch (err) {
      console.error(
        "Ошибка загрузки истории продлений:",
        err?.response?.data || err
      );
      set({ extensionHistory: [], extensionHistoryLoading: false });
    }
  },

  clearExtensionHistory: () =>
    set({ extensionHistory: [], extensionHistoryLoading: false }),

  clearError: () => set({ error: null }),
  clearCurrent: () => set({ currentGtd: null }),
}));