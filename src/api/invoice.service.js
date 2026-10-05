import API_URL_AUTH from "./auth.service";


const buildContractInvoicesUrl = (branchId, companyId, contractId) =>
  `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/invoices`;

export const getInvoices = async (branchId, companyId, contractId) => {
  const { data } = await API_URL_AUTH.get(
    buildContractInvoicesUrl(branchId, companyId, contractId)
  );
  return data;
};

export const getInvoiceById = async (
  branchId,
  companyId,
  contractId,
  invoiceId
) => {
  const { data } = await API_URL_AUTH.get(
    `${buildContractInvoicesUrl(branchId, companyId, contractId)}/${invoiceId}`
  );
  return data;
};

export const createInvoice = async (
  branchId,
  companyId,
  contractId,
  formData
) => {
  const { data } = await API_URL_AUTH.post(
    buildContractInvoicesUrl(branchId, companyId, contractId),
    formData
  );
  return data;
};

export const updateInvoice = async (
  branchId,
  companyId,
  contractId,
  invoiceId,
  formData
) => {
  const { data } = await API_URL_AUTH.put(
    `${buildContractInvoicesUrl(branchId, companyId, contractId)}/${invoiceId}`,
    formData
  );
  return data;
};

export const deleteInvoice = async (
  branchId,
  companyId,
  contractId,
  invoiceId
) => {
  const { data } = await API_URL_AUTH.delete(
    `${buildContractInvoicesUrl(branchId, companyId, contractId)}/${invoiceId}`
  );
  return data;
};

export const getAgreementInvoices = async (
  branchId,
  companyId,
  contractId,
  agreementId
) => {
  const { data } = await API_URL_AUTH.get(
    `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/additional-agreements/${agreementId}/invoices`
  );
  return data;
};

export const getAgreementInvoiceById = async (
  branchId,
  companyId,
  contractId,
  agreementId,
  invoiceId
) => {
  const { data } = await API_URL_AUTH.get(
    `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/invoices/${invoiceId}`
  );
  return data;
};

export const createAgreementInvoice = async (
  branchId,
  companyId,
  contractId,
  agreementId,
  formData
) => {
  if (agreementId && !formData.has("agreement_id")) {
    formData.append("agreement_id", String(agreementId));
  }

  const { data } = await API_URL_AUTH.post(
    buildContractInvoicesUrl(branchId, companyId, contractId),
    formData,
    {
      params: agreementId ? { agreement_id: agreementId } : undefined,
    }
  );
  return data;
};

export const updateAgreementInvoice = async (
  branchId,
  companyId,
  contractId,
  agreementId,
  invoiceId,
  formData
) => {
  if (agreementId && !formData.has("agreement_id")) {
    formData.append("agreement_id", String(agreementId));
  }

  const { data } = await API_URL_AUTH.put(
    `${buildContractInvoicesUrl(branchId, companyId, contractId)}/${invoiceId}`,
    formData,
    {
      params: agreementId ? { agreement_id: agreementId } : undefined,
    }
  );
  return data;
};

export const deleteAgreementInvoice = async (
  branchId,
  companyId,
  contractId,
  agreementId,
  invoiceId
) => {
  const { data } = await API_URL_AUTH.delete(
    `${buildContractInvoicesUrl(branchId, companyId, contractId)}/${invoiceId}`,
    { params: agreementId ? { agreement_id: agreementId } : undefined }
  );
  return data;
};