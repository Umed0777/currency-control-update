import { create } from "zustand";
import {
  getTrashList,
  getTrashDetail,
  getTrashFile,
  restoreTrashItem,
} from "../api/trash.service";

const DEFAULT_FILTERS = {
  entity_type: "",
  branch_id: "",
  search: "",
  page: 1,
  page_size: 20,
};

export const useTrashStore = create((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },

  // Детали выбранного документа (для модалки)
  detail: null,
  detailLoading: false,
  detailError: null,

  // ==== Фильтры ====
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  resetFilters: () =>
    set({
      filters: { ...DEFAULT_FILTERS },
      page: 1,
      pageSize: 20,
    }),

  // ==== Список ====
  fetchTrash: async (overrideFilters) => {
    set({ loading: true, error: null });
    try {
      const filters = overrideFilters ?? get().filters;

      const data = await getTrashList({
        entity_type: filters.entity_type || undefined,
        branch_id: filters.branch_id || undefined,
        search: filters.search || undefined,
        page: filters.page || 1,
        page_size: filters.page_size || 20,
      });

      // Ответ: { data: [...], page, page_size, total }
      const items = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

      set({
        items,
        total: data?.total ?? items.length,
        page: data?.page ?? filters.page ?? 1,
        pageSize: data?.page_size ?? filters.page_size ?? 20,
        filters: {
          ...filters,
          page: data?.page ?? filters.page ?? 1,
          page_size: data?.page_size ?? filters.page_size ?? 20,
        },
      });
    } catch (error) {
      console.error("Ошибка fetchTrash:", error?.response?.data || error);
      set({
        error:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Ошибка при загрузке корзины",
      });
    } finally {
      set({ loading: false });
    }
  },

  // ==== Детали ====
  fetchDetail: async (entityType, id) => {
    set({ detailLoading: true, detailError: null, detail: null });
    try {
      const data = await getTrashDetail(entityType, id);
      set({ detail: data });
      return data;
    } catch (error) {
      console.error("Ошибка fetchDetail:", error?.response?.data || error);
      set({
        detailError:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Ошибка при загрузке документа",
      });
      throw error;
    } finally {
      set({ detailLoading: false });
    }
  },

  clearDetail: () => set({ detail: null, detailError: null }),

  // ==== Файл ====
  downloadFile: async (entityType, id, filename) => {
    const response = await getTrashFile(entityType, id);

    // Определяем имя файла из Content-Disposition, если бэк отдал
    const disposition = response?.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const serverName = match ? decodeURIComponent(match[1]) : null;

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = serverName || filename || `document-${id}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // Открыть файл в новой вкладке (для PDF)
  openFile: async (entityType, id) => {
    const response = await getTrashFile(entityType, id);
    const blob = new Blob([response.data], {
      type: response?.headers?.["content-type"] || "application/pdf",
    });
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  },

  // ==== Восстановление ====
  restore: async (entityType, id) => {
    set({ loading: true, error: null });
    try {
      await restoreTrashItem(entityType, id);
      // Убираем из локального списка
      set((s) => ({
        items: s.items.filter(
          (it) =>
            !(
              String(it.id) === String(id) &&
              String(it.entity_type) === String(entityType)
            )
        ),
        total: Math.max(0, s.total - 1),
      }));
      return true;
    } catch (error) {
      console.error("Ошибка restore:", error?.response?.data || error);
      set({
        error:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Ошибка при восстановлении",
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null, detailError: null }),
}));