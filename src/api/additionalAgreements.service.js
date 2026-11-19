import API_URL_AUTH from "./auth.service";

const buildBaseUrl = (branchId, companyId, contractId) =>
  `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/additional-agreements`;

// Принимает и готовый FormData, и обычный объект — в любом случае
// на выходе получаем корректный FormData со всеми полями.
const toFormData = (payload) => {
  if (payload instanceof FormData) return payload;

  const formData = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof Blob) {
      formData.append(key, value, value.name);
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
};

const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

// === Список доп. соглашений ===
export const fetchAdditionalAgreements = async (
  branchId,
  companyId,
  contractId
) => {
  const { data } = await API_URL_AUTH.get(
    buildBaseUrl(branchId, companyId, contractId)
  );
  return data;
};

// === Одно доп. соглашение ===
export const fetchAdditionalAgreementById = async (
  branchId,
  companyId,
  contractId,
  agreementId
) => {
  const { data } = await API_URL_AUTH.get(
    `${buildBaseUrl(branchId, companyId, contractId)}/${agreementId}`
  );
  return data;
};

// === Список инвойсов доп. соглашения ===
export const fetchAdditionalAgreementInvoices = async (
  branchId,
  companyId,
  contractId,
  agreementId
) => {
  const { data } = await API_URL_AUTH.get(
    `${buildBaseUrl(branchId, companyId, contractId)}/${agreementId}/invoices`
  );
  return data;
};

// === Создание ===
export const createAdditionalAgreement = async (
  branchId,
  companyId,
  contractId,
  payload
) => {
  const { data } = await API_URL_AUTH.post(
    buildBaseUrl(branchId, companyId, contractId),
    toFormData(payload),
    MULTIPART
  );
  return data;
};

// === Обновление ===
export const updateAdditionalAgreement = async (
  branchId,
  companyId,
  contractId,
  agreementId,
  payload
) => {
  const { data } = await API_URL_AUTH.put(
    `${buildBaseUrl(branchId, companyId, contractId)}/${agreementId}`,
    toFormData(payload),
    MULTIPART
  );
  return data;
};

// === Удаление ===
export const deleteAdditionalAgreement = async (
  branchId,
  companyId,
  contractId,
  agreementId
) => {
  const { data } = await API_URL_AUTH.delete(
    `${buildBaseUrl(branchId, companyId, contractId)}/${agreementId}`
  );
  return data;
};