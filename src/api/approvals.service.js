import API_URL_AUTH from "./auth.service";

const BASE_URL = "/api/approvals";
const COMPLIANCE_URL = "/api/compliance";

// ============================================================
// СПИСОК ДОКУМЕНТОВ НА СОГЛАСОВАНИИ
// ============================================================
export const fetchPendingApprovals = async (filters = {}) => {
  const params = {};
  if (filters.stage) params.stage = filters.stage;
  if (filters.entity_type) params.entity_type = filters.entity_type;
  if (filters.branch_id) params.branch_id = filters.branch_id;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const { data } = await API_URL_AUTH.get(`${BASE_URL}/pending`, { params });
  return data;
};

// ============================================================
// ДЕТАЛИ ДОКУМЕНТА
// ============================================================
export const fetchApprovalDetail = async (entityType, id) => {
  const { data } = await API_URL_AUTH.get(
    `${BASE_URL}/${entityType}/${id}`
  );
  return data;
};

// ============================================================
// РЕШЕНИЕ КОМПЛАЕНСА
// ============================================================
export const submitComplianceDecision = async (entityType, id, payload) => {
  const { data } = await API_URL_AUTH.post(
    `${BASE_URL}/${entityType}/${id}/compliance`,
    {
      decision: payload.decision,
      comment: payload.comment || "",
    }
  );
  return data;
};

// ============================================================
// РЕШЕНИЕ ВАЛЮТНОГО КОНТРОЛЯ
// ============================================================
export const submitCurrencyControlDecision = async (
  entityType,
  id,
  payload
) => {
  const { data } = await API_URL_AUTH.post(
    `${BASE_URL}/${entityType}/${id}/currency-control`,
    {
      decision: payload.decision,
      comment: payload.comment || "",
    }
  );
  return data;
};

// ============================================================
// ЗАЯВКИ НА ПРОДЛЕНИЕ ГТД
// ============================================================
export const fetchGtdExtensionsPending = async (
  branchId,
  page = 1,
  pageSize = 20
) => {
  const { data } = await API_URL_AUTH.get(
    `${BASE_URL}/gtd-extensions/pending`,
    { params: { branch_id: branchId, page, page_size: pageSize } }
  );
  return data;
};

export const reviewGtdExtension = async (requestId, payload) => {
  const { data } = await API_URL_AUTH.post(
    `${BASE_URL}/gtd-extensions/${requestId}/review`,
    {
      decision: payload.decision,
      comment: payload.comment || "",
      approved_deadline: payload.approved_deadline || null,
    }
  );
  return data;
};

// ============================================================
// ПРАВА ВАЛЮТНОГО КОНТРОЛЯ (COMPLIANCE)
// ============================================================
export const fetchCurrencyControlPermissions = async () => {
  const { data } = await API_URL_AUTH.get(
    `${COMPLIANCE_URL}/permissions/currency-control`
  );
  return data;
};

export const grantCurrencyControlPermission = async (payload) => {
  const { data } = await API_URL_AUTH.post(
    `${COMPLIANCE_URL}/permissions/currency-control`,
    {
      login: payload.login,
      can_create: !!payload.can_create,
      can_edit: !!payload.can_edit,
      can_delete: !!payload.can_delete,
    }
  );
  return data;
};

export const revokeCurrencyControlPermission = async (login) => {
  const { data } = await API_URL_AUTH.delete(
    `${COMPLIANCE_URL}/permissions/currency-control/${login}`
  );
  return data;
};