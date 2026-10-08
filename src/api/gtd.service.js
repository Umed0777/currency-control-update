import API_URL_AUTH from "./auth.service";

// ============================================================
//  БАЗОВЫЕ URL
// ============================================================

// Для ГТД по контракту (общий список)
const buildContractGtdUrl = (branchId, companyId, contractId) =>
  `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/gtd`;

// Для ГТД по инвойсу (обычному или доп. соглашения)
const buildInvoiceGtdUrl = (branchId, companyId, contractId, invoiceId) =>
  `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/invoices/${invoiceId}/gtd`;

// Для ГТД по доп. соглашению (общий список)
const buildAgreementGtdUrl = (
  branchId,
  companyId,
  contractId,
  agreementId
) =>
  `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/additional-agreements/${agreementId}/gtd`;

// ============================================================
//  GET — СПИСКИ И КАРТОЧКИ
// ============================================================

/**
 * GET список ГТД по контракту
 */
export const fetchGtdList = async (branchId, companyId, contractId) => {
  const { data } = await API_URL_AUTH.get(
    buildContractGtdUrl(branchId, companyId, contractId)
  );
  return data;
};

/**
 * GET список ГТД по инвойсу (обычному или доп. соглашения)
 */
export const fetchGtdByInvoice = async (
  branchId,
  companyId,
  contractId,
  invoiceId
) => {
  const { data } = await API_URL_AUTH.get(
    buildInvoiceGtdUrl(branchId, companyId, contractId, invoiceId)
  );
  return data;
};

/**
 * GET список ГТД по доп. соглашению (общий, без привязки к инвойсу)
 */
export const fetchGtdByAgreement = async (
  branchId,
  companyId,
  contractId,
  agreementId
) => {
  const { data } = await API_URL_AUTH.get(
    buildAgreementGtdUrl(branchId, companyId, contractId, agreementId)
  );
  return data;
};

/**
 * GET карточка ГТД по ID
 */
export const fetchGtdById = async (
  branchId,
  companyId,
  contractId,
  gtdId
) => {
  const { data } = await API_URL_AUTH.get(
    `${buildContractGtdUrl(branchId, companyId, contractId)}/${gtdId}`
  );
  return data;
};

// ============================================================
//  POST / PUT / DELETE
// ============================================================

const buildGtdFormData = (payload) => {
  const fd = new FormData();

  const append = (key, value) => {
    if (value === undefined || value === null || value === "") return;
    fd.append(key, String(value));
  };

  append("gtd_number", payload.gtd_number);
  append("gtd_date", payload.gtd_date);
  append("gtd_amount", payload.gtd_amount);
  append("gtd_currency", payload.gtd_currency);
  append("hs_code", payload.hs_code);
  append("destination_country", payload.destination_country);
  append("document_type", payload.document_type);
  append("invoice_id", payload.invoice_id);

  // ✅ Поля отправителя (согласно Swagger)
  append("sender_name", payload.sender_name);
  append("sender_bank", payload.sender_bank);
  append("sender_country", payload.sender_country);

  if (payload.document instanceof File) {
    fd.append("document", payload.document);
  }

  return fd;
};

/**
 * POST создать ГТД, привязанный к инвойсу
 */
export const createGtd = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  payload
) => {
  const fd = buildGtdFormData(payload);
  const { data } = await API_URL_AUTH.post(
    buildInvoiceGtdUrl(branchId, companyId, contractId, invoiceId),
    fd,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

/**
 * PUT обновить ГТД
 */
export const updateGtd = async (
  branchId,
  companyId,
  contractId,
  gtdId,
  payload
) => {
  const fd = buildGtdFormData(payload);
  const { data } = await API_URL_AUTH.put(
    `${buildContractGtdUrl(branchId, companyId, contractId)}/${gtdId}`,
    fd,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

/**
 * DELETE ГТД
 */
export const deleteGtd = async (
  branchId,
  companyId,
  contractId,
  gtdId
) => {
  const { data } = await API_URL_AUTH.delete(
    `${buildContractGtdUrl(branchId, companyId, contractId)}/${gtdId}`
  );
  return data;
};

// ============================================================
//  ПРОДЛЕНИЕ СРОКА
// ============================================================

export const extendGtdDeadline = async ({
  branchId,
  companyId,
  contractId,
  invoiceId,
  gtdId,
  requestedDeadline,
  document,
}) => {
  const fd = new FormData();
  fd.append("requested_deadline", requestedDeadline);
  if (document) fd.append("document", document);

  const { data } = await API_URL_AUTH.post(
    `${buildInvoiceGtdUrl(
      branchId,
      companyId,
      contractId,
      invoiceId
    )}/${gtdId}/extend`,
    fd,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const getGtdExtensionHistory = async ({
  branchId,
  companyId,
  contractId,
  invoiceId,
  gtdId,
}) => {
  const { data } = await API_URL_AUTH.get(
    `${buildInvoiceGtdUrl(
      branchId,
      companyId,
      contractId,
      invoiceId
    )}/${gtdId}/extension-history`
  );
  return data;
};