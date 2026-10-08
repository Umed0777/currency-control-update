import API_URL_AUTH from "./auth.service";

// ============================================================
//  БАЗОВЫЕ URL
// ============================================================

// ПП по обычному инвойсу
const buildInvoicePoUrl = (branchId, companyId, contractId, invoiceId) =>
  `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/invoices/${invoiceId}/payment-orders`;

// ПП по инвойсу доп. соглашения
const buildAgreementInvoicePoUrl = (
  branchId,
  companyId,
  contractId,
  agreementId,
  invoiceId
) =>
  `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/additional-agreements/${agreementId}/invoices/${invoiceId}/payment-orders`;

// ============================================================
//  GET — СПИСКИ И КАРТОЧКИ
// ============================================================

/**
 * GET список ПП по инвойсу (обычному или доп. соглашения)
 * Если передан agreementId — используется URL доп. соглашения
 */
export const fetchPaymentOrders = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  agreementId = null
) => {
  const url = agreementId
    ? buildAgreementInvoicePoUrl(
        branchId,
        companyId,
        contractId,
        agreementId,
        invoiceId
      )
    : buildInvoicePoUrl(branchId, companyId, contractId, invoiceId);

  const { data } = await API_URL_AUTH.get(url);
  return data;
};

/**
 * GET карточка ПП по ID
 */
export const fetchPaymentOrderById = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  poId,
  agreementId = null
) => {
  const base = agreementId
    ? buildAgreementInvoicePoUrl(
        branchId,
        companyId,
        contractId,
        agreementId,
        invoiceId
      )
    : buildInvoicePoUrl(branchId, companyId, contractId, invoiceId);

  const { data } = await API_URL_AUTH.get(`${base}/${poId}`);
  return data;
};

// ============================================================
//  POST / PUT / DELETE
// ============================================================

const buildPoFormData = (payload) => {
  const fd = new FormData();

  const append = (key, value) => {
    if (value === undefined || value === null || value === "") return;
    if (value instanceof File) {
      fd.append(key, value);
    } else {
      fd.append(key, String(value));
    }
  };

  append("operation_date", payload.operation_date);
  append("payment_order_number", payload.payment_order_number);
  append("amount", payload.amount);
  append("currency", payload.currency);
  append("payer", payload.payer);
  append("receiver_name", payload.receiver_name);
  append("receiver_bank", payload.receiver_bank);
  append("payment_purpose", payload.payment_purpose);
  append("receiver_country", payload.receiver_country);
  append("value_date", payload.value_date);

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
 * POST создать ПП
 */
export const createPaymentOrder = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  payload,
  agreementId = null
) => {
  const url = agreementId
    ? buildAgreementInvoicePoUrl(
        branchId,
        companyId,
        contractId,
        agreementId,
        invoiceId
      )
    : buildInvoicePoUrl(branchId, companyId, contractId, invoiceId);

  const fd = buildPoFormData(payload);

  const { data } = await API_URL_AUTH.post(url, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/**
 * PUT обновить ПП
 */
export const updatePaymentOrder = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  poId,
  payload,
  agreementId = null
) => {
  const base = agreementId
    ? buildAgreementInvoicePoUrl(
        branchId,
        companyId,
        contractId,
        agreementId,
        invoiceId
      )
    : buildInvoicePoUrl(branchId, companyId, contractId, invoiceId);

  const fd = buildPoFormData(payload);

  const { data } = await API_URL_AUTH.put(`${base}/${poId}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/**
 * DELETE ПП
 */
export const deletePaymentOrder = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  poId,
  agreementId = null
) => {
  const base = agreementId
    ? buildAgreementInvoicePoUrl(
        branchId,
        companyId,
        contractId,
        agreementId,
        invoiceId
      )
    : buildInvoicePoUrl(branchId, companyId, contractId, invoiceId);

  const { data } = await API_URL_AUTH.delete(`${base}/${poId}`);
  return data;
};