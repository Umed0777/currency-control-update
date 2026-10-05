import API_URL_AUTH from "./auth.service";

// === Архивные контракты филиала (с пагинацией) ===
export const fetchBranchArchive = async (branchId, page = 1, pageSize = 20) => {
  const { data } = await API_URL_AUTH.get(
    `/api/branches/${branchId}/archive`,
    { params: { page, page_size: pageSize } }
  );
  return data;
};

// === Архивные контракты компании ===
export const fetchCompanyArchive = async (branchId, companyId) => {
  const { data } = await API_URL_AUTH.get(
    `/api/branches/${branchId}/dashboard/companies/${companyId}/archive`
  );
  return data;
};

// === Восстановить контракт ===
export const restoreContract = async (branchId, companyId, contractId) => {
  const { data } = await API_URL_AUTH.put(
    `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/restore`
  );
  return data;
};

// === Восстановить доп. соглашение ===
export const restoreAdditionalAgreement = async (
  branchId,
  companyId,
  contractId,
  agreementId
) => {
  const { data } = await API_URL_AUTH.put(
    `/api/branches/${branchId}/dashboard/companies/${companyId}/contracts/${contractId}/additional-agreements/${agreementId}/restore`
  );
  return data;
};