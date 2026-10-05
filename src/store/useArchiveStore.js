import { create } from "zustand";
import {
  fetchBranchArchive,
  fetchCompanyArchive,
  restoreContract,
  restoreAdditionalAgreement,
} from "../api/archive.service";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

export const useArchiveStore = create((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  error: null,
  restoring: null,

  setPage: (page) => set({ page }),

  // Загрузка архива филиала
  fetchArchive: async (branchId, page = 1, pageSize = 20) => {
    set({ loading: true, error: null, page, pageSize });
    try {
      const data = await fetchBranchArchive(branchId, page, pageSize);
      const list = toArray(data);
      const total = data?.total ?? data?.count ?? list.length;
      set({ items: list, total, loading: false });
      return list;
    } catch (err) {
      set({
        loading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить архив",
      });
      throw err;
    }
  },

  // Загрузка архива компании
  fetchCompanyArchive: async (branchId, companyId) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchCompanyArchive(branchId, companyId);
      const list = toArray(data);
      set({ items: list, total: list.length, loading: false });
      return list;
    } catch (err) {
      set({
        loading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить архив компании",
      });
      throw err;
    }
  },

  // Восстановить контракт
  restoreContract: async (branchId, companyId, contractId) => {
    set({ restoring: contractId });
    try {
      const result = await restoreContract(
        branchId,
        companyId,
        contractId
      );
      set((state) => ({
        items: state.items.filter(
          (item) => String(item.id) !== String(contractId)
        ),
        total: Math.max(0, state.total - 1),
        restoring: null,
      }));
      return result;
    } catch (err) {
      set({ restoring: null });
      throw err;
    }
  },

  // Восстановить доп. соглашение
  restoreAgreement: async (branchId, companyId, contractId, agreementId) => {
    set({ restoring: agreementId });
    try {
      const result = await restoreAdditionalAgreement(
        branchId,
        companyId,
        contractId,
        agreementId
      );
      set({ restoring: null });
      return result;
    } catch (err) {
      set({ restoring: null });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
  clear: () => set({ items: [], total: 0, page: 1, error: null }),
}));