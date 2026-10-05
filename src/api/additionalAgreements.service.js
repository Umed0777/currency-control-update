import API_URL_AUTH from "./auth.service";

const buildBaseUrl = (branchId, companyId, contractId) =>
  `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/additional-agreements`;

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

export const createAdditionalAgreement = async (
  branchId,
  companyId,
  contractId,
  payload
) => {
  const formData = new FormData();

  const append = (key, value) => {
    if (value === undefined || value === null) return;
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  };

  append("agreement_number", payload.agreement_number);
  append("agreement_date", payload.agreement_date);
  append("subject", payload.subject);
  append("delivery_date", payload.delivery_date);
  append("return_days", payload.return_days);
  append("amount", payload.amount);
  append("currency", payload.currency);
  append("receiver_name", payload.receiver_name);
  append("receiver_bank", payload.receiver_bank);
  append("receiver_country", payload.receiver_country);
  append("agreement_end_date", payload.agreement_end_date);
  append("doc_type", payload.doc_type);
  if (payload.document) {
    formData.append("document", payload.document);
  }

  const { data } = await API_URL_AUTH.post(
    buildBaseUrl(branchId, companyId, contractId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
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
  const formData = new FormData();

  const append = (key, value) => {
    if (value === undefined || value === null) return;
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  };

  append("agreement_number", payload.agreement_number);
  append("agreement_date", payload.agreement_date);
  append("subject", payload.subject);
  append("delivery_date", payload.delivery_date);
  append("agreement_end_date", payload.agreement_end_date);
  append("return_days", payload.return_days);
  append("doc_type", payload.doc_type);
  if (payload.document) {
    formData.append("document", payload.document);
  }

  const { data } = await API_URL_AUTH.put(
    `${buildBaseUrl(branchId, companyId, contractId)}/${agreementId}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
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