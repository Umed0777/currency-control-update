import { create } from "zustand";

import {
  getBranches,
  getBranchesById,
  createBranchCompany,
  getCompanyContracts,
  createCompanyContract,
  getAdditionalAgreements,
  createAdditionalAgreement,
  getContractInvoices,
  createContractInvoice,
  getInvoiceGtd,
  createInvoiceGtd,
  getCounters,
  getCurrencies,
  getBranchNotifications,
} from "../api/branches.service";

export const useBranchesStore = create((set) => ({
  branches: [],
  branch: null,
  companies: [],
  contracts: [],
  additionalAgreements: [],
  invoices: [],
  countries: [],
  currencies: [],
  notifications: [],
  notificationsTotal: 0,
  gtd: [],
  loading: false,
  error: null,

  fetchBranches: async () => {
    set({
      loading: true,
      error: null,
    });

    try {
      const data = await getBranches();

      set({
        branches: data,
      });
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка при загрузке филиалов",
      });
    } finally {
      set({
        loading: false,
      });
    }
  },

  fetchBranchById: async (id, filters = {}) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const data = await getBranchesById(id, filters);

      set({
        branch: data,
      });

      return data;
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка при загрузке филиала",
      });
    } finally {
      set({
        loading: false,
      });
    }
  },

  fetchNotifications: async (id) => {
    try {
      set({ loading: true, error: null });
      const data = await getBranchNotifications(id);
      set({
        notifications: data?.notifications || [],
        notificationsTotal: data?.total || 0,
        loading: false,
      });
    } catch (error) {
      console.error("Ошибка загрузки уведомлений:", error);
      set({
        notifications: [],
        notificationsTotal: 0,
        error: error?.response?.data?.message || "Ошибка загрузки уведомлений",
        loading: false,
      });
    }
  },

  createCompany: async (id, data) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const response = await createBranchCompany(id, data);

      set({
        companies: response,
        loading: false,
      });

      return response;
    } catch (error) {
      set({
        error: error.response?.data?.message || error.message,
        loading: false,
      });

      throw error;
    }
  },
  fetchCompanyContracts: async (branchId, companyId) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const data = await getCompanyContracts(branchId, companyId);

      set({
        contracts: Array.isArray(data) ? data : [],
      });

      return data;
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка при загрузке контрактов",
      });

      throw error;
    } finally {
      set({
        loading: false,
      });
    }
  },
  createContract: async (branchId, companyId, data) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const newContract = await createCompanyContract(
        branchId,
        companyId,
        data,
      );

      set((state) => ({
        contracts: [...state.contracts, newContract],
        loading: false,
      }));

      return newContract;
    } catch (error) {
      set({
        error:
          error.response?.data?.message ||
          error.message ||
          "Ошибка создания контракта",
        loading: false,
      });

      throw error;
    }
  },
  fetchAdditionalAgreements: async (branchId, companyId, contractId) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const data = await getAdditionalAgreements(
        branchId,
        companyId,
        contractId,
      );

      set({
        additionalAgreements: Array.isArray(data) ? data : [],
      });

      return data;
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка загрузки дополнительных соглашений",
      });

      throw error;
    } finally {
      set({
        loading: false,
      });
    }
  },

  createAdditionalAgreement: async (branchId, companyId, contractId, data) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const newAgreement = await createAdditionalAgreement(
        branchId,
        companyId,
        contractId,
        data,
      );

      set((state) => ({
        additionalAgreements: [...state.additionalAgreements, newAgreement],
        loading: false,
      }));

      return newAgreement;
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка создания дополнительного соглашения",
        loading: false,
      });

      throw error;
    }
  },
  fetchContractInvoices: async (branchId, companyId, contractId) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const data = await getContractInvoices(branchId, companyId, contractId);

      set({
        invoices: Array.isArray(data) ? data : [],
      });

      return data;
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка загрузки инвойсов",
      });

      throw error;
    } finally {
      set({
        loading: false,
      });
    }
  },

  createInvoice: async (branchId, companyId, contractId, data) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const newInvoice = await createContractInvoice(
        branchId,
        companyId,
        contractId,
        data,
      );

      set((state) => ({
        invoices: [...state.invoices, newInvoice],
        loading: false,
      }));

      return newInvoice;
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Ошибка создания инвойса",
        loading: false,
      });

      throw error;
    }
  },
fetchInvoiceGtd: async (
  branchId,
  companyId,
  contractId,
  invoiceId,
) => {
  set({
    loading: true,
    error: null,
  });

  try {
    const data = await getInvoiceGtd(
      branchId,
      companyId,
      contractId,
      invoiceId,
    );

    set({
      gtd: Array.isArray(data) ? data : [],
    });

    return data;
  } catch (error) {
    set({
      error:
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Ошибка при загрузке ГТД",
    });

    throw error;
  } finally {
    set({
      loading: false,
    });
  }
},

createGtd: async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  data,
) => {
  set({
    loading: true,
    error: null,
  });

  try {
    const newGtd = await createInvoiceGtd(
      branchId,
      companyId,
      contractId,
      invoiceId,
      data,
    );

    set({
      loading: false,
    });

    return newGtd;
  } catch (error) {
    set({
      error:
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Ошибка создания ГТД",
      loading: false,
    });

    throw error;
  }
},
  fetCountries: async (q = "") => {
    set({ loading: true, error: null });
    try {
      const data = await getCounters(q);
      set({ countries: data });
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка при загрузке страны",
      });
    } finally {
      set({
        loading: false,
      });
    }
  },
  fetCurrencies: async (q = "") => {
    set({ loading: true, error: null });
    try {
      const data = await getCurrencies(q);
      set({ currencies: data });
    } catch (error) {
      set({
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка при загрузке валюты",
      });
    } finally {
      set({
        loading: false,
      });
    }
  },
}));
