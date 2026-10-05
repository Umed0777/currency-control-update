import API_URL_AUTH from "./auth.service";

export const getBranchDashboard = async (branchId, filters = {}) => {
  const params = {};

  if (filters.query) params.query = filters.query;
  if (filters.search_type) params.search_type = filters.search_type;

  try {
    const response = await API_URL_AUTH.get(
      `/api/branches/${branchId}/dashboard`,
      { params }
    );
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      const response = await API_URL_AUTH.get(
        `/api/branches/${branchId}/dashboard/companies`,
        { params }
      );
      return response.data;
    }
    throw error;
  }
};

export const getBranchDashboardNotifications = async (branchId) => {
  try {
    const response = await API_URL_AUTH.get(
      `/api/branches/${branchId}/dashboard/notifications`
    );
    return response.data;
  } catch (error) {
    console.error("Ошибка загрузки уведомлений:", error?.response?.data || error);
    throw error;
  }
};

// Поиск клиента по ИНН в CBS
export const getClientByInn = async (inn) => {
  try {
    const response = await API_URL_AUTH.get("/api/clients/by-inn", {
      params: { inn },
    });
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) return null;
    console.warn("getClientByInn:", error?.response?.status, error?.message);
    return null;
  }
};

export const createCompany = async (branchId, { inn }) => {
  const response = await API_URL_AUTH.post(
    `/api/branches/${branchId}/dashboard/companies`,
    { inn }
  );
  return response.data;
};

export const updateCompany = async (branchId, companyId, payload) => {
  const response = await API_URL_AUTH.put(
    `/api/branches/${branchId}/dashboard/companies/${companyId}`,
    payload
  );
  return response.data;
};

export const deleteCompany = async (branchId, companyId) => {
  const response = await API_URL_AUTH.delete(
    `/api/branches/${branchId}/dashboard/companies/${companyId}`
  );
  return response.data;
};