import API_URL_AUTH from "./auth.service";

const BASE_URL = "/api/reports";

// ============================================================
// ВИДЫ ОТЧЁТОВ
// ============================================================
export const fetchReportTypes = async () => {
  const { data } = await API_URL_AUTH.get(`${BASE_URL}/types`);
  return data;
};

// ============================================================
// ВАЛЮТЫ КЛИЕНТА (для фильтра)
// ============================================================
export const fetchClientCurrencies = async (clientId) => {
  const { data } = await API_URL_AUTH.get(
    `${BASE_URL}/clients/${clientId}/currencies`
  );
  return data;
};

// ============================================================
// ОТЧЁТ ПО КОНТРАКТАМ (JSON)
// ============================================================
export const fetchContractsReport = async (filters = {}) => {
  const params = {};
  if (filters.branch_id) params.branch_id = filters.branch_id;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  if (filters.currency) params.currency = filters.currency;

  const { data } = await API_URL_AUTH.get(`${BASE_URL}/contracts`, {
    params,
  });
  return data;
};

// ============================================================
// ВЫГРУЗКА EXCEL
// ============================================================
export const exportReport = async (filters = {}) => {
  const params = {};
  if (filters.type) params.type = filters.type;
  if (filters.inn) params.inn = filters.inn;
  if (filters.branch_id) params.branch_id = filters.branch_id;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  if (filters.currency) params.currency = filters.currency;

  const response = await API_URL_AUTH.get(`${BASE_URL}/export`, {
    params,
    responseType: "blob",
  });
  return response;
};

// ============================================================
// ШАБЛОН ОТЧЁТА — СКАЧАТЬ
// ============================================================
export const downloadReportTemplate = async (reportType) => {
  const response = await API_URL_AUTH.get(
    `${BASE_URL}/templates/${reportType}`,
    { responseType: "blob" }
  );
  return response;
};

export const uploadReportTemplate = async (reportType, file) => {
  const formData = new FormData();
  formData.append("template", file);

  const { data } = await API_URL_AUTH.post(
    `${BASE_URL}/templates/${reportType}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};