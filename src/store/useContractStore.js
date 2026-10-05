import { create } from 'zustand';
import { contractService } from '../api/contract.service';

export const useContractStore = create((set) => ({
  contracts: [],
  currentContract: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchContracts: async (branchId, companyId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await contractService.getContracts(branchId, companyId);
      set({ contracts: data, isLoading: false });
    } catch (error) {
      set({
        error:
          error.response?.data?.message || 'Ошибка загрузки контрактов',
        isLoading: false,
      });
    }
  },

  fetchContractById: async (branchId, companyId, contractId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await contractService.getContractById(
        branchId,
        companyId,
        contractId
      );
      set({ currentContract: data, isLoading: false });
      return data;
    } catch (error) {
      set({
        error:
          error.response?.data?.message || 'Ошибка загрузки контракта',
        isLoading: false,
      });
    }
  },

  // ==== СОЗДАТЬ КОНТРАКТ ====
  createContract: async (branchId, companyId, contractData) => {
    set({ isLoading: true, error: null });
    try {
      const newContract = await contractService.createContract(
        branchId,
        companyId,
        contractData
      );
      set((state) => ({
        contracts: [newContract, ...state.contracts],
        isLoading: false,
      }));
      return newContract;
    } catch (error) {
      set({
        error:
          error.response?.data?.message || 'Ошибка создания контракта',
        isLoading: false,
      });
      throw error;
    }
  },

  // ==== ОБНОВИТЬ КОНТРАКТ ====
  updateContract: async (branchId, companyId, contractId, contractData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedContract = await contractService.updateContract(
        branchId,
        companyId,
        contractId,
        contractData
      );

      set((state) => ({
        contracts: state.contracts.map((c) =>
          c.id === contractId ? { ...c, ...updatedContract } : c
        ),
        currentContract:
          state.currentContract?.id === contractId
            ? { ...state.currentContract, ...updatedContract }
            : state.currentContract,
        isLoading: false,
      }));

      return updatedContract;
    } catch (error) {
      set({
        error:
          error.response?.data?.message || 'Ошибка обновления контракта',
        isLoading: false,
      });
      throw error;
    }
  },

  // ==== УДАЛИТЬ КОНТРАКТ ====
  deleteContract: async (branchId, companyId, contractId) => {
    try {
      await contractService.deleteContract(branchId, companyId, contractId);
      set((state) => ({
        contracts: state.contracts.filter((c) => c.id !== contractId),
      }));
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Ошибка удаления',
      });
      throw error;
    }
  },
}));