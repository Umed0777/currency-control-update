import API_URL_AUTH from "./auth.service";

export const contractService = {
  getContracts: async (branchId, companyId) => {
    const response = await API_URL_AUTH.get(`/api/branches/${branchId}/dashboard/companies/${companyId}/contracts`);
    return response.data;
  },

  getContractById: async (branchId, companyId, contractId) => {
    const response = await API_URL_AUTH.get(`/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}`);
    return response.data;
  },
  createContract: async (branchId, companyId, data) => {
    const formData = new FormData();
    
    Object.keys(data).forEach(key => {
      if (key !== 'document' && data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });

    if (data.document) {
      formData.append('document', data.document);
    }

    const response = await API_URL_AUTH.post(
      `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts`, 
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  updateContract: async (branchId, companyId, contractId, data) => {
    const formData = new FormData();
    
    Object.keys(data).forEach(key => {
      if (key !== 'document' && data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });

    if (data.document) {
      formData.append('document', data.document);
    }

    const response = await API_URL_AUTH.put(
      `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}`, 
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  deleteContract: async (branchId, companyId, contractId) => {
    const response = await API_URL_AUTH.delete(`/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}`);
    return response.data;
  }
};