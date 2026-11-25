import { create } from "zustand";
import { getMyDocuments } from "../api/myDocuments.service";
// ВАЖНО: Убедитесь, что путь к axios-инстансу правильный
import API_URL_AUTH from "../api/auth.service"; 

const DEFAULT_FILTERS = {
  scope: "all",
  status: "all",
  entity_type: "all",
  page: 1,
  page_size: 20,
};

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export const useMyDocumentsStore = create((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  resetFilters: () =>
    set({
      filters: { ...DEFAULT_FILTERS },
      page: 1,
      pageSize: 20,
    }),

  fetchMyDocuments: async (overrideFilters) => {
    set({ loading: true, error: null });
    try {
      const filters = overrideFilters ?? get().filters;

      const data = await getMyDocuments({
        scope: filters.scope || "all",
        status: filters.status || "all",
        entity_type: filters.entity_type || "all",
        page: filters.page || 1,
        page_size: filters.page_size || 20,
      });

      const items = toArray(data);

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
      console.error("Ошибка fetchMyDocuments:", error?.response?.data || error);
      set({
        error:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Ошибка при загрузке документов",
      });
    } finally {
      set({ loading: false });
    }
  },

  // ==========================================
  // ИСПРАВЛЕННАЯ ФУНКЦИЯ РЕСАБМИТА
  // ==========================================
  resubmitDocument: async (entityType, entityId, payload) => {
    try {
      const { branchId, companyId, contractId, invoiceId, agreementId } = payload;

      let url = "";
      // Формируем правильный URL в зависимости от типа документа.
      // ПРИМЕЧАНИЕ: Сверьте этот URL со Swagger вашего бэкенда!
      // Я использую структуру, аналогичную вашим PUT-запросам.
      
      if (entityType === "payment_order") {
        url = `/api/branches/${branchId}/companies/${companyId}/contracts/${contractId}/invoices/${invoiceId}/payment_orders/${entityId}/resubmit/`;
      } else if (entityType === "gtd") {
        url = `/api/branches/${branchId}/companies/${companyId}/contracts/${contractId}/gtd/${entityId}/resubmit/`;
      } else {
        // На случай других типов
        url = `/api/branches/${branchId}/companies/${companyId}/contracts/${contractId}/${entityType}/${entityId}/resubmit/`;
      }

      // Если у вас есть доп. соглашение, возможно URL должен быть длиннее:
      // if (agreementId) url = `/api/.../agreements/${agreementId}/...`;

      // Метод тоже проверьте (POST или PATCH)
      const response = await API_URL_AUTH.post(url, { comment: payload.comment });
      return response.data;
    } catch (error) {
      console.error("Ошибка в resubmitDocument:", error);
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clear: () =>
    set({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      loading: false,
      error: null,
      filters: { ...DEFAULT_FILTERS },
    }),
}));