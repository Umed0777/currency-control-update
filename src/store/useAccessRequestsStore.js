import { create } from "zustand";
import { fetchAccessRequestNotifications } from "../api/accessRequests.service";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export const useAccessRequestsStore = create((set, get) => ({
  notifications: [],
  total: 0,
  loading: false,
  error: null,

  fetchNotifications: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchAccessRequestNotifications();
      const list = toArray(data);
      set({
        notifications: list,
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
          "Не удалось загрузить уведомления о заявках на доступ",
      });
      throw err;
    }
  },
  clearError: () => set({ error: null }),
  clear: () =>
    set({
      notifications: [],
      total: 0,
      loading: false,
      error: null,
    }),
}));