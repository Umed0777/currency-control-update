import API_URL_AUTH from "./auth.service";

const buildBaseUrl = (branchId, companyId, contractId) =>
  `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/gtd`;

const buildInvoiceBaseUrl = (branchId, companyId, contractId, invoiceId) =>
  `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/invoices/${invoiceId}/gtd`;

// ============================================================
//  СПИСКИ / КАРТОЧКИ
// ============================================================

export const fetchGtdList = async (branchId, companyId, contractId) => {
  const { data } = await API_URL_AUTH.get(
    buildBaseUrl(branchId, companyId, contractId)
  );
  return data;
};

export const fetchGtdById = async (
  branchId,
  companyId,
  contractId,
  gtdId
) => {
  const { data } = await API_URL_AUTH.get(
    `${buildBaseUrl(branchId, companyId, contractId)}/${gtdId}`
  );
  return data;
};

export const fetchGtdByInvoice = async (
  branchId,
  companyId,
  contractId,
  invoiceId
) => {
  const { data } = await API_URL_AUTH.get(
    buildInvoiceBaseUrl(branchId, companyId, contractId, invoiceId)
  );
  return data;
};

// ============================================================
//  СОЗДАНИЕ / ОБНОВЛЕНИЕ / УДАЛЕНИЕ
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

  if (payload.document instanceof File) {
    fd.append("document", payload.document);
  }

  return fd;
};

export const createGtd = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  payload
) => {
  const fd = buildGtdFormData(payload);
  const { data } = await API_URL_AUTH.post(
    buildInvoiceBaseUrl(branchId, companyId, contractId, invoiceId),
    fd,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const updateGtd = async (
  branchId,
  companyId,
  contractId,
  gtdId,
  payload
) => {
  const fd = buildGtdFormData(payload);
  const { data } = await API_URL_AUTH.put(
    `${buildBaseUrl(branchId, companyId, contractId)}/${gtdId}`,
    fd,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const deleteGtd = async (
  branchId,
  companyId,
  contractId,
  gtdId
) => {
  const { data } = await API_URL_AUTH.delete(
    `${buildBaseUrl(branchId, companyId, contractId)}/${gtdId}`
  );
  return data;
};

// ============================================================
//  ПРОДЛЕНИЕ СРОКА ГТД
// ============================================================

/**
 * POST /api/branches/{id}/dashboard/companies/{company_id}/contracts/{contract_id}
 *      /invoices/{invoice_id}/gtd/{gtd_id}/extend
 *
 * multipart/form-data:
 *   - requested_deadline: "YYYY-MM-DD"
 *   - document: File (PDF)
 */
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
    `${buildInvoiceBaseUrl(
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

/**
 * GET /api/branches/{id}/dashboard/companies/{company_id}/contracts/{contract_id}
 *     /invoices/{invoice_id}/gtd/{gtd_id}/extension-history
 *
 * Возвращает массив заявок на продление срока по конкретной ГТД.
 */
export const getGtdExtensionHistory = async ({
  branchId,
  companyId,
  contractId,
  invoiceId,
  gtdId,
}) => {
  const { data } = await API_URL_AUTH.get(
    `${buildInvoiceBaseUrl(
      branchId,
      companyId,
      contractId,
      invoiceId
    )}/${gtdId}/extension-history`
  );
  return data;
};