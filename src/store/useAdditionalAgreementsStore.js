import { create } from "zustand";
import {
  fetchAdditionalAgreements,
  fetchAdditionalAgreementById,
  fetchAdditionalAgreementInvoices,
  createAdditionalAgreement,
  updateAdditionalAgreement,
  deleteAdditionalAgreement,
} from "../api/additionalAgreements.service";

export const useAdditionalAgreementsStore = create((set, get) => ({
  // === Состояние ===
  agreements: [],
  currentAgreement: null,
  invoices: [],
  isLoading: false,
  isLoadingInvoices: false,
  error: null,
  invoicesError: null,

  // === Список доп. соглашений ===
  fetchAgreements: async (branchId, companyId, contractId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchAdditionalAgreements(
        branchId,
        companyId,
        contractId
      );
      set({
        agreements: Array.isArray(data) ? data : [],
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить доп. соглашения",
      });
    }
  },

  // === Одно доп. соглашение ===
  fetchAgreementById: async (branchId, companyId, contractId, agreementId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchAdditionalAgreementById(
        branchId,
        companyId,
        contractId,
        agreementId
      );
      set({ currentAgreement: data, isLoading: false });
      return data;
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить карточку доп. соглашения",
      });
      throw err;
    }
  },

  // === Список инвойсов доп. соглашения ===
  fetchAgreementInvoices: async (
    branchId,
    companyId,
    contractId,
    agreementId
  ) => {
    set({ isLoadingInvoices: true, invoicesError: null });
    try {
      const data = await fetchAdditionalAgreementInvoices(
        branchId,
        companyId,
        contractId,
        agreementId
      );
      // API возвращает массив — обрабатываем оба случая на всякий случай
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];

      set({
        invoices: list,
        isLoadingInvoices: false,
      });
      return list;
    } catch (err) {
      set({
        isLoadingInvoices: false,
        invoicesError:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить инвойсы доп. соглашения",
      });
      throw err;
    }
  },

  // === Создание ===
  createAgreement: async (branchId, companyId, contractId, payload) => {
    set({ isLoading: true, error: null });
    try {
      const created = await createAdditionalAgreement(
        branchId,
        companyId,
        contractId,
        payload
      );
      set((state) => ({
        agreements: [created, ...state.agreements],
        isLoading: false,
      }));
      return created;
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось создать доп. соглашение",
      });
      throw err;
    }
  },

  // === Обновление ===
  updateAgreement: async (
    branchId,
    companyId,
    contractId,
    agreementId,
    payload
  ) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateAdditionalAgreement(
        branchId,
        companyId,
        contractId,
        agreementId,
        payload
      );
      set((state) => ({
        agreements: state.agreements.map((item) =>
          item.id === agreementId ? { ...item, ...updated } : item
        ),
        currentAgreement:
          state.currentAgreement?.id === agreementId
            ? { ...state.currentAgreement, ...updated }
            : state.currentAgreement,
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось обновить доп. соглашение",
      });
      throw err;
    }
  },

  // === Удаление ===
  deleteAgreement: async (branchId, companyId, contractId, agreementId) => {
    set({ isLoading: true, error: null });
    try {
      await deleteAdditionalAgreement(
        branchId,
        companyId,
        contractId,
        agreementId
      );
      set((state) => ({
        agreements: state.agreements.filter((item) => item.id !== agreementId),
        isLoading: false,
      }));
    } catch (err) {
      set({
        isLoading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось удалить доп. соглашение",
      });
      throw err;
    }
  },

  // === Сброс ===
  clearError: () => set({ error: null }),
  clearInvoicesError: () => set({ invoicesError: null }),
  clearCurrent: () => set({ currentAgreement: null }),
  clearInvoices: () => set({ invoices: [] }),
}));