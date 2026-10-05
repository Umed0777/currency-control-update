import API_URL_AUTH from "./auth.service";

const buildBaseUrl = (branchId, companyId, contractId, invoiceId) =>
  `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/invoices/${invoiceId}/payment-orders`;

// ==== GET список платёжных поручений ====
export const fetchPaymentOrders = async (
  branchId,
  companyId,
  contractId,
  invoiceId
) => {
  const { data } = await API_URL_AUTH.get(
    buildBaseUrl(branchId, companyId, contractId, invoiceId)
  );
  return data;
};

// ==== GET карточка платёжного поручения ====
export const fetchPaymentOrderById = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  poId
) => {
  const { data } = await API_URL_AUTH.get(
    `${buildBaseUrl(branchId, companyId, contractId, invoiceId)}/${poId}`
  );
  return data;
};

// ==== POST создание платёжного поручения ====
export const createPaymentOrder = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
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

  if (payload.document) {
    formData.append("document", payload.document);
  }

  const { data } = await API_URL_AUTH.post(
    buildBaseUrl(branchId, companyId, contractId, invoiceId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

// ==== PUT редактирование платёжного поручения ====
export const updatePaymentOrder = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  poId,
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

  if (payload.document) {
    formData.append("document", payload.document);
  }

  const { data } = await API_URL_AUTH.put(
    `${buildBaseUrl(branchId, companyId, contractId, invoiceId)}/${poId}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

// ==== DELETE платёжного поручения ====
export const deletePaymentOrder = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  poId
) => {
  const { data } = await API_URL_AUTH.delete(
    `${buildBaseUrl(branchId, companyId, contractId, invoiceId)}/${poId}`
  );
  return data;
};