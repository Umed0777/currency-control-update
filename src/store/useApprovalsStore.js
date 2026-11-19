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
  // Новые импорты
  searchCurrencyControlUsers,
  updateCurrencyControlPermission,
} from "../api/approvals.service";

// Все типы документов, которые должны показываться при фильтре "Все типы"
const ALL_ENTITY_TYPES = [
  "contract",
  "invoice",
  "gtd",
  "additional_agreement",
  "payment_order",
];

// Сколько записей запрашиваем у бэкенда по каждому типу
const FETCH_LIMIT_PER_TYPE = 200;

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const sliceByPage = (all, page, pageSize) =>
  all.slice((page - 1) * pageSize, page * pageSize);

export const useApprovalsStore = create((set, get) => ({
  // === Список на согласовании ===
  allItems: [],
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
  
  // === Поиск пользователей ===
  userSearchResults: [],
  userSearchLoading: false,

  // ============================================================
  // СПИСОК НА СОГЛАСОВАНИИ (все типы документов)
  // ============================================================
  fetchPending: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const { stage, entity_type, ...rest } = filters;
      const types = entity_type ? [entity_type] : ALL_ENTITY_TYPES;

      const results = await Promise.allSettled(
        types.map((type) =>
          fetchPendingApprovals({
            page: 1,
            page_size: FETCH_LIMIT_PER_TYPE,
            ...rest,
            ...(stage ? { stage } : {}),
            entity_type: type,
          }),
        ),
      );

      const merged = [];
      let firstError = null;

      results.forEach((r, i) => {
        if (r.status !== "fulfilled") {
          if (!firstError) firstError = r.reason;
          return;
        }
        toArray(r.value).forEach((x) =>
          merged.push({ ...x, entity_type: x.entity_type || types[i] }),
        );
      });

      if (merged.length === 0 && firstError) {
        throw firstError;
      }

      const seen = new Set();
      const unique = merged.filter((x) => {
        const key = `${x.entity_type}-${x.entity_id ?? x.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      unique.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      );

      const { page, pageSize } = get();
      const maxPage = Math.max(1, Math.ceil(unique.length / pageSize));
      const safePage = Math.min(page, maxPage);

      set({
        allItems: unique,
        items: sliceByPage(unique, safePage, pageSize),
        total: unique.length,
        page: safePage,
        loading: false,
      });
      return unique;
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
        payload,
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
      const data = await fetchGtdExtensionsPending(branchId, page, pageSize);
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
          (item) => String(item.id) !== String(requestId),
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
          (item) => String(item.login) !== String(login),
        ),
        submitting: false,
      }));
      return result;
    } catch (err) {
      set({ submitting: false });
      throw err;
    }
  },

  // НОВОЕ: Поиск пользователей
  searchUsers: async (query) => {
    if (!query) {
      set({ userSearchResults: [] });
      return;
    }
    set({ userSearchLoading: true });
    try {
      const data = await searchCurrencyControlUsers(query);
      const list = toArray(data);
      set({ userSearchResults: list, userSearchLoading: false });
      return list;
    } catch (err) {
      set({ userSearchLoading: false });
      // Тихо игнорируем ошибку поиска, чтобы не спамить пользователя
    }
  },

  // НОВОЕ: Обновление прав
  updatePermission: async (login, payload) => {
    set({ submitting: true });
    try {
      const result = await updateCurrencyControlPermission(login, payload);
      await get().fetchPermissions();
      set({ submitting: false });
      return result;
    } catch (err) {
      set({ submitting: false });
      throw err;
    }
  },

  // ============================================================
  // Сброс
  // ============================================================
  setPage: (page) => {
    const { allItems, pageSize } = get();
    set({ page, items: sliceByPage(allItems, page, pageSize) });
  },
  setPageSize: (size) => {
    const { allItems, page } = get();
    set({ pageSize: size, items: sliceByPage(allItems, page, size) });
  },
  clearError: () => set({ error: null }),
  clearDetail: () => set({ detail: null, detailError: null }),
  clear: () =>
    set({
      allItems: [],
      items: [],
      total: 0,
      page: 1,
      detail: null,
      gtdItems: [],
      gtdTotal: 0,
      permissions: [],
      userSearchResults: [],
      error: null,
    }),
}));