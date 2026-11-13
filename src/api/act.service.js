import API_URL_AUTH from "./auth.service";

const BASE_URL = "/api/branches";

// Получить список Актов для инвойса
export const getActsByInvoice = async (branchId, companyId, contractId, invoiceId) => {
  const { data } = await API_URL_AUTH.get(
    `${BASE_URL}/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/invoices/${invoiceId}/acts`
  );
  return data;
};

// Получить список всех Актов контракта (если понадобится)
export const getActsByContract = async (branchId, companyId, contractId) => {
  const { data } = await API_URL_AUTH.get(
    `${BASE_URL}/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/acts`
  );
  return data;
};

// Создать Акт (POST, multipart/form-data, так как есть файл)
export const createAct = async (branchId, companyId, contractId, invoiceId, formData) => {
  const { data } = await API_URL_AUTH.post(
    `${BASE_URL}/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/invoices/${invoiceId}/acts`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return data;
};

// Обновить Акт (PUT, multipart/form-data)
export const updateAct = async (branchId, companyId, contractId, actId, formData) => {
  const { data } = await API_URL_AUTH.put(
    `${BASE_URL}/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/acts/${actId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return data;
};

// Удалить Акт (DELETE)
export const deleteAct = async (branchId, companyId, contractId, actId) => {
  const { data } = await API_URL_AUTH.delete(
    `${BASE_URL}/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/acts/${actId}`
  );
  return data;
};