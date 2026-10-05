import { create } from "zustand";
import {
 getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../api/users.service";

export const useUsersStore = create((set, get) => ({
  // === Состояние ===
  users: [],
  isLoading: false,
  isSubmitting: false,
  error: null,

  // === Список пользователей ===
  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getUsers();
      set({
        users: Array.isArray(data) ? data : [],
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить пользователей",
      });
      throw err;
    }
  },

  // === Создание ===
  createUser: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const created = await createUser(payload);
      set((state) => ({
        users: [created, ...state.users],
        isSubmitting: false,
      }));
      return created;
    } catch (err) {
      set({
        isSubmitting: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось создать пользователя",
      });
      throw err;
    }
  },

  // === Обновление ===
  updateUser: async (userId, payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const updated = await updateUser(userId, payload);
      set((state) => ({
        users: state.users.map((item) =>
          item.id === userId ? { ...item, ...updated } : item
        ),
        isSubmitting: false,
      }));
      return updated;
    } catch (err) {
      set({
        isSubmitting: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось обновить пользователя",
      });
      throw err;
    }
  },

  // === Удаление ===
  deleteUser: async (userId) => {
    set({ isSubmitting: true, error: null });
    try {
      await deleteUser(userId);
      set((state) => ({
        users: state.users.filter((item) => item.id !== userId),
        isSubmitting: false,
      }));
    } catch (err) {
      set({
        isSubmitting: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось удалить пользователя",
      });
      throw err;
    }
  },

  // === Сброс ===
  clearError: () => set({ error: null }),
  clearUsers: () => set({ users: [] }),
}));