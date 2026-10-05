import { create } from "zustand";
import {
  fetchPaymentOrders,
  fetchPaymentOrderById,
  createPaymentOrder as apiCreatePaymentOrder,
  updatePaymentOrder as apiUpdatePaymentOrder,
  deletePaymentOrder as apiDeletePaymentOrder,
} from "../api/paymentOrder.service";

export const usePaymentOrderStore = create((set, get) => ({
  paymentOrders: [],
  isLoading: false,
  error: null,

  // ==== Список ====
  fetchPaymentOrders: async (branchId, companyId, contractId, invoiceId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchPaymentOrders(
        branchId,
        companyId,
        contractId,
        invoiceId
      );
      set({
        paymentOrders: Array.isArray(data) ? data : [],
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error.response?.data?.message ||
          "Ошибка загрузки платёжных поручений",
        isLoading: false,
      });
    }
  },

  // ==== Один по ID ====
  fetchPaymentOrderById: async (
    branchId,
    companyId,
    contractId,
    invoiceId,
    poId
  ) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchPaymentOrderById(
        branchId,
        companyId,
        contractId,
        invoiceId,
        poId
      );
      set({ isLoading: false });
      return data;
    } catch (error) {
      set({
        error:
          error.response?.data?.message ||
          "Ошибка загрузки платёжного поручения",
        isLoading: false,
      });
      throw error;
    }
  },

  // ==== Создать ====
  createPaymentOrder: async (
    branchId,
    companyId,
    contractId,
    invoiceId,
    payload
  ) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiCreatePaymentOrder(
        branchId,
        companyId,
        contractId,
        invoiceId,
        payload
      );
      set((state) => ({
        paymentOrders: [data, ...state.paymentOrders],
        isLoading: false,
      }));
      return data;
    } catch (error) {
      set({
        error:
          error.response?.data?.message ||
          "Ошибка создания платёжного поручения",
        isLoading: false,
      });
      throw error;
    }
  },

  // ==== Обновить ====
  updatePaymentOrder: async (
    branchId,
    companyId,
    contractId,
    invoiceId,
    poId,
    payload
  ) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiUpdatePaymentOrder(
        branchId,
        companyId,
        contractId,
        invoiceId,
        poId,
        payload
      );
      set((state) => ({
        paymentOrders: state.paymentOrders.map((po) =>
          po.id === poId ? data : po
        ),
        isLoading: false,
      }));
      return data;
    } catch (error) {
      set({
        error:
          error.response?.data?.message ||
          "Ошибка обновления платёжного поручения",
        isLoading: false,
      });
      throw error;
    }
  },

  // ==== Удалить ====
  deletePaymentOrder: async (
    branchId,
    companyId,
    contractId,
    invoiceId,
    poId
  ) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeletePaymentOrder(
        branchId,
        companyId,
        contractId,
        invoiceId,
        poId
      );
      set((state) => ({
        paymentOrders: state.paymentOrders.filter((po) => po.id !== poId),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error.response?.data?.message ||
          "Ошибка удаления платёжного поручения",
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));