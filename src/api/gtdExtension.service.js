import API_URL_AUTH from "./auth.service";

const BASE_URL = "/api/branches";

const gtdUrl = (branchId, companyId, contractId, invoiceId, gtdId) =>
  `${BASE_URL}/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/invoices/${invoiceId}/gtd/${gtdId}`;

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

// Подать заявку на продление срока ГТД (POST, multipart)
// formData: requested_deadline (YYYY-MM-DD), document (pdf, обязателен)
export const extendGtd = async (branchId, companyId, contractId, invoiceId, gtdId, formData) => {
  const { data } = await API_URL_AUTH.post(
    `${gtdUrl(branchId, companyId, contractId, invoiceId, gtdId)}/extend`,
    formData,
    multipart,
  );
  return data;
};

// Редактировать заявку (доработка) (PUT, multipart)
// formData: requested_deadline, document (необязательно)
export const updateGtdExtension = async (branchId, companyId, contractId, invoiceId, gtdId, requestId, formData) => {
  const { data } = await API_URL_AUTH.put(
    `${gtdUrl(branchId, companyId, contractId, invoiceId, gtdId)}/extend/${requestId}`,
    formData,
    multipart,
  );
  return data;
};

// История продлений срока ГТД (GET)
export const getGtdExtensionHistory = async (branchId, companyId, contractId, invoiceId, gtdId) => {
  const { data } = await API_URL_AUTH.get(
    `${gtdUrl(branchId, companyId, contractId, invoiceId, gtdId)}/extension-history`,
  );
  return data;
};