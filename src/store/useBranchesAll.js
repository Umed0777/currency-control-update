import { create } from "zustand";
import {
  getBranchesAll,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../api/branchesAll.service";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.branches)) return data.branches;
  return [];
};

export const useBranchesAllStore = create((set, get) => ({
  branchesAll: [],
  currentBranch: null,
  loading: false,
  error: null,

  fetchBranchesAll: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getBranchesAll();
      set({ branchesAll: toArray(data) });
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка при загрузке всех филиалов",
      });
    } finally {
      set({ loading: false });
    }
  },

  fetchBranchById: async (branchId) => {
    set({ loading: true, error: null });
    try {
      const data = await getBranchById(branchId);
      set({ currentBranch: data });
      return data;
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка при загрузке филиала",
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  addBranch: async (id, name) => {
    set({ loading: true, error: null });
    try {
      const created = await createBranch(id, name);
      set({
        branchesAll: [...get().branchesAll, created].sort(
          (a, b) => Number(a.id) - Number(b.id)
        ),
      });
      return created;
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка при создании филиала",
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  editBranch: async (branchId, name) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateBranch(branchId, name);
      set({
        branchesAll: get().branchesAll.map((b) =>
          b.id === Number(branchId) ? { ...b, ...updated } : b
        ),
        currentBranch:
          get().currentBranch?.id === Number(branchId)
            ? { ...get().currentBranch, ...updated }
            : get().currentBranch,
      });
      return updated;
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка при обновлении филиала",
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  removeBranch: async (branchId) => {
    set({ loading: true, error: null });
    try {
      await deleteBranch(branchId);
      set({
        branchesAll: get().branchesAll.filter((b) => b.id !== Number(branchId)),
        currentBranch:
          get().currentBranch?.id === Number(branchId)
            ? null
            : get().currentBranch,
      });
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка при удалении филиала",
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));