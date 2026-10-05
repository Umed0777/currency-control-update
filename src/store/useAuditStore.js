import { create } from "zustand";
import { getAuditLogs } from "../api/audit.service";

export const useAuditStore = create((set) => ({
  logs: [],
  total: 0,
  limit: 50,
  offset: 0,
  filters: {
    user_login: "",
    action: "",
    entity: "",
    branch_id: "",
    from_date: null,
    to_date: null,
  },
  isLoading: false,
  error: null,

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  resetFilters: () =>
    set({
      filters: {
        user_login: "",
        action: "",
        entity: "",
        branch_id: "",
        from_date: null,
        to_date: null,
      },
    }),

  fetchAuditLogs: async (override = {}) => {
    set({ isLoading: true, error: null });
    try {
      const state = useAuditStore.getState();
      const params = {
        ...state.filters,
        limit: state.limit,
        offset: state.offset,
        ...override,
      };

      // Преобразуем dayjs → YYYY-MM-DD
      if (params.from_date && params.from_date.format) {
        params.from_date = params.from_date.format("YYYY-MM-DD");
      }
      if (params.to_date && params.to_date.format) {
        params.to_date = params.to_date.format("YYYY-MM-DD");
      }

      const data = await getAuditLogs(params);

      set({
        logs: Array.isArray(data?.logs) ? data.logs : [],
        total: data?.total ?? 0,
        limit: data?.limit ?? state.limit,
        offset: data?.offset ?? state.offset,
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Ошибка загрузки журнала аудита",
        isLoading: false,
      });
    }
  },

  setPagination: (limit, offset) => set({ limit, offset }),

  clearError: () => set({ error: null }),
}));