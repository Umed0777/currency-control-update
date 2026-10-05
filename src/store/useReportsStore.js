import { create } from "zustand";
import {
  fetchReportTypes,
  fetchClientCurrencies,
  fetchContractsReport,
  exportReport,
  downloadReportTemplate,
  uploadReportTemplate,
} from "../api/reports.service";

export const useReportsStore = create((set, get) => ({
  // === Виды отчётов ===
  reportTypes: [],
  typesLoading: false,

  // === Валюты клиента ===
  clientCurrencies: [],
  currenciesLoading: false,

  // === Данные отчёта ===
  report: null,
  reportLoading: false,

  // === Экспорт ===
  exporting: false,

  // === Загрузка шаблона ===
  uploading: false,

  // === Ошибка ===
  error: null,

  // ============================================================
  // ВИДЫ ОТЧЁТОВ
  // ============================================================
  fetchTypes: async () => {
    set({ typesLoading: true, error: null });
    try {
      const data = await fetchReportTypes();
      const list = Array.isArray(data) ? data : [];
      set({ reportTypes: list, typesLoading: false });
      return list;
    } catch (err) {
      set({
        typesLoading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить виды отчётов",
      });
      throw err;
    }
  },

  // ============================================================
  // ВАЛЮТЫ КЛИЕНТА
  // ============================================================
  fetchClientCurrencies: async (clientId) => {
    set({ currenciesLoading: true, error: null });
    try {
      const data = await fetchClientCurrencies(clientId);
      const list = Array.isArray(data) ? data : [];
      set({ clientCurrencies: list, currenciesLoading: false });
      return list;
    } catch (err) {
      set({
        currenciesLoading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить валюты клиента",
      });
      throw err;
    }
  },

  // ============================================================
  // ОТЧЁТ ПО КОНТРАКТАМ
  // ============================================================
  fetchContracts: async (filters = {}) => {
    set({ reportLoading: true, error: null });
    try {
      const data = await fetchContractsReport(filters);
      set({ report: data, reportLoading: false });
      return data;
    } catch (err) {
      set({
        reportLoading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить отчёт",
      });
      throw err;
    }
  },

  // ============================================================
  // ВЫГРУЗКА EXCEL
  // ============================================================
  exportReport: async (filters = {}) => {
    set({ exporting: true, error: null });
    try {
      const response = await exportReport(filters);
      set({ exporting: false });
      return response;
    } catch (err) {
      set({
        exporting: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось выгрузить отчёт",
      });
      throw err;
    }
  },

  // ============================================================
  // СКАЧАТЬ ШАБЛОН
  // ============================================================
  downloadTemplate: async (reportType) => {
    try {
      const response = await downloadReportTemplate(reportType);
      return response;
    } catch (err) {
      set({
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось скачать шаблон",
      });
      throw err;
    }
  },

  // ============================================================
  // ЗАГРУЗИТЬ ШАБЛОН
  // ============================================================
  uploadTemplate: async (reportType, file) => {
    set({ uploading: true, error: null });
    try {
      const data = await uploadReportTemplate(reportType, file);
      set({ uploading: false });
      return data;
    } catch (err) {
      set({
        uploading: false,
        error:
          err?.response?.data?.error ||
          err?.message ||
          "Не удалось загрузить шаблон",
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
  clearReport: () => set({ report: null }),
  clear: () =>
    set({
      report: null,
      clientCurrencies: [],
      error: null,
    }),
}));