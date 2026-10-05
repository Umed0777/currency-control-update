import { create } from "zustand";
import {
  // Контракт
  getInvoices,
  getInvoiceById,
  createInvoice as apiCreateInvoice,
  updateInvoice as apiUpdateInvoice,
  deleteInvoice as apiDeleteInvoice,
  // Доп. соглашение
  getAgreementInvoices,
  getAgreementInvoiceById,
  createAgreementInvoice,
  updateAgreementInvoice,
  deleteAgreementInvoice,
} from "../api/invoice.service";

export const useInvoiceStore = create((set) => ({
  invoices: [],
  isLoading: false,
  error: null,

  // ============ СПИСОК ИНВОЙСОВ ============
  // Если передан agreementId — берём инвойсы доп. соглашения
  fetchInvoices: async (branchId, companyId, contractId, agreementId) => {
    set({ isLoading: true, error: null });
    try {
      const data = agreementId
        ? await getAgreementInvoices(
            branchId,
            companyId,
            contractId,
            agreementId
          )
        : await getInvoices(branchId, companyId, contractId);

      set({ invoices: Array.isArray(data) ? data : [], isLoading: false });
    } catch (error) {
      set({
        error:
          error.response?.data?.message ||
          "Ошибка загрузки списка инвойсов",
        isLoading: false,
      });
    }
  },

  // ============ ОДИН ИНВОЙС ============
  fetchInvoiceById: async (
    branchId,
    companyId,
    contractId,
    invoiceId,
    agreementId
  ) => {
    set({ isLoading: true, error: null });
    try {
      const data = agreementId
        ? await getAgreementInvoiceById(
            branchId,
            companyId,
            contractId,
            agreementId,
            invoiceId
          )
        : await getInvoiceById(branchId, companyId, contractId, invoiceId);

      set({ isLoading: false });
      return data;
    } catch (error) {
      set({
        error: error.response?.data?.message || "Ошибка загрузки инвойса",
        isLoading: false,
      });
      throw error;
    }
  },

  // ============ СОЗДАНИЕ ============
  // ВАЖНО: formData идёт ПЕРЕД agreementId
  createInvoice: async (
    branchId,
    companyId,
    contractId,
    formData,
    agreementId
  ) => {
    set({ isLoading: true, error: null });
    try {
      const data = agreementId
        ? await createAgreementInvoice(
            branchId,
            companyId,
            contractId,
            agreementId,
            formData
          )
        : await apiCreateInvoice(
            branchId,
            companyId,
            contractId,
            formData
          );

      set((state) => ({
        invoices: [data, ...state.invoices],
        isLoading: false,
      }));
      return data;
    } catch (error) {
      set({
        error: error.response?.data?.message || "Ошибка создания инвойса",
        isLoading: false,
      });
      throw error;
    }
  },

  // ============ ОБНОВЛЕНИЕ ============
  // ВАЖНО: invoiceId, потом formData, потом agreementId
  updateInvoice: async (
    branchId,
    companyId,
    contractId,
    invoiceId,
    formData,
    agreementId
  ) => {
    set({ isLoading: true, error: null });
    try {
      const data = agreementId
        ? await updateAgreementInvoice(
            branchId,
            companyId,
            contractId,
            agreementId,
            invoiceId,
            formData
          )
        : await apiUpdateInvoice(
            branchId,
            companyId,
            contractId,
            invoiceId,
            formData
          );

      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId ? data : inv
        ),
        isLoading: false,
      }));
      return data;
    } catch (error) {
      set({
        error: error.response?.data?.message || "Ошибка обновления инвойса",
        isLoading: false,
      });
      throw error;
    }
  },

  // ============ УДАЛЕНИЕ ============
  // ВАЖНО: invoiceId, потом agreementId
  deleteInvoice: async (
    branchId,
    companyId,
    contractId,
    invoiceId,
    agreementId
  ) => {
    set({ isLoading: true, error: null });
    try {
      if (agreementId) {
        await deleteAgreementInvoice(
          branchId,
          companyId,
          contractId,
          agreementId,
          invoiceId
        );
      } else {
        await apiDeleteInvoice(branchId, companyId, contractId, invoiceId);
      }

      set((state) => ({
        invoices: state.invoices.filter((inv) => inv.id !== invoiceId),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error.response?.data?.message || "Ошибка удаления инвойса",
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));