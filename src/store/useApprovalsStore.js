import { create } from "zustand";
import {
  fetchPendingApprovals,
  fetchApprovalDetail,
  submitComplianceDecision,
  submitCurrencyControlDecision,
  fetchGtdExtensionsPending,
  reviewGtdExtension,
  fetchCurrencyControlPermissions,
  grantCurrencyControlPermission,
  revokeCurrencyControlPermission,
} from "../api/approvals.service";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export const useApprovalsStore = create((set, get) => ({
  // === Список на согласовании ===
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  error: null,

  // === Детали ===
  detail: null,
  detailLoading: false,
  detailError: null,

  // === Общее ===
  submitting: false,

  // === GTD extensions ===
  gtdItems: [],
  gtdTotal: 0,
  gtdLoading: false,

  // === Права ВК ===
  permissions: [],
  permissionsLoading: false,

  // ============================================================
  // СПИСОК НА СОГЛАСОВАНИИ
  // ============================================================
  fetchPending: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchPendingApprovals({
        page: get().page,
        page_size: get().pageSize,
        ...filters,
      });
      const list = toArray(data);
      set({
        items: list,
        total: data?.total ?? list.length,
        loading: false,
      });
      return list;
    } catch (err) {
      set({
        loading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить список согласований",
      });
      throw err;
    }
  },

  // ============================================================
  // ДЕТАЛИ
  // ============================================================
  fetchDetail: async (entityType, id) => {
    set({ detailLoading: true, detailError: null, detail: null });
    try {
      const data = await fetchApprovalDetail(entityType, id);
      set({ detail: data, detailLoading: false });
      return data;
    } catch (err) {
      set({
        detailLoading: false,
        detailError:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить детали",
      });
      throw err;
    }
  },

  // ============================================================
  // РЕШЕНИЯ
  // ============================================================
  submitCompliance: async (entityType, id, payload) => {
    set({ submitting: true });
    try {
      const result = await submitComplianceDecision(entityType, id, payload);
      set({ submitting: false });
      return result;
    } catch (err) {
      set({ submitting: false });
      throw err;
    }
  },

  submitCurrencyControl: async (entityType, id, payload) => {
    set({ submitting: true });
    try {
      const result = await submitCurrencyControlDecision(
        entityType,
        id,
        payload
      );
      set({ submitting: false });
      return result;
    } catch (err) {
      set({ submitting: false });
      throw err;
    }
  },

  // ============================================================
  // GTD
  // ============================================================
  fetchGtdPending: async (branchId, page = 1, pageSize = 20) => {
    set({ gtdLoading: true, error: null });
    try {
      const data = await fetchGtdExtensionsPending(
        branchId,
        page,
        pageSize
      );
      const list = toArray(data);
      set({
        gtdItems: list,
        gtdTotal: data?.total ?? list.length,
        gtdLoading: false,
      });
      return list;
    } catch (err) {
      set({
        gtdLoading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить заявки ГТД",
      });
      throw err;
    }
  },

  reviewGtd: async (requestId, payload) => {
    set({ submitting: true });
    try {
      const result = await reviewGtdExtension(requestId, payload);
      set((state) => ({
        gtdItems: state.gtdItems.filter(
          (item) => String(item.id) !== String(requestId)
        ),
        submitting: false,
      }));
      return result;
    } catch (err) {
      set({ submitting: false });
      throw err;
    }
  },

  // ============================================================
  // ПРАВА ВК
  // ============================================================
  fetchPermissions: async () => {
    set({ permissionsLoading: true, error: null });
    try {
      const data = await fetchCurrencyControlPermissions();
      const list = toArray(data);
      set({ permissions: list, permissionsLoading: false });
      return list;
    } catch (err) {
      set({
        permissionsLoading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить права",
      });
      throw err;
    }
  },

  grantPermission: async (payload) => {
    set({ submitting: true });
    try {
      const result = await grantCurrencyControlPermission(payload);
      await get().fetchPermissions();
      set({ submitting: false });
      return result;
    } catch (err) {
      set({ submitting: false });
      throw err;
    }
  },

  revokePermission: async (login) => {
    set({ submitting: true });
    try {
      const result = await revokeCurrencyControlPermission(login);
      set((state) => ({
        permissions: state.permissions.filter(
          (item) => String(item.login) !== String(login)
        ),
        submitting: false,
      }));
      return result;
    } catch (err) {
      set({ submitting: false });
      throw err;
    }
  },

  // ============================================================
  // Сброс
  // ============================================================
  setPage: (page) => set({ page }),
  setPageSize: (size) => set({ pageSize: size }),
  clearError: () => set({ error: null }),
  clearDetail: () => set({ detail: null, detailError: null }),
  clear: () =>
    set({
      items: [],
      total: 0,
      page: 1,
      detail: null,
      gtdItems: [],
      gtdTotal: 0,
      permissions: [],
      error: null,
    }),
}));