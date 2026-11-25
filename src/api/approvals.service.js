import API_URL_AUTH from "./auth.service";

const BASE_URL = "/api/approvals";
const COMPLIANCE_URL = "/api/compliance";

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
// ПРИНЯТЫЕ ДОКУМЕНТЫ (только админ)
// GET /api/approvals/accepted
// Документы (ГТД и ПП), прошедшие комплаенс и валютный контроль.
// Параметры: entity_type, branch_id, page, page_size (макс. 100)
// Ответ: { items: [...], page, page_size, total }
// ============================================================
export const fetchAcceptedApprovals = async (filters = {}) => {
  const params = {};
  if (filters.entity_type) params.entity_type = filters.entity_type;
  if (filters.branch_id) params.branch_id = filters.branch_id;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const { data } = await API_URL_AUTH.get(`${BASE_URL}/accepted`, { params });
  return data;
};

export const fetchApprovalDetail = async (entityType, id) => {
  const { data } = await API_URL_AUTH.get(
    `${BASE_URL}/${entityType}/${id}`
  );
  return data;
};

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

// Мои права (текущего пользователя)
// Ответ: { login, can_create, can_edit, can_delete }
// GET /api/compliance/permissions/currency-control/me
// Доступ: Валютный контроль, Комплаенс, Администратор.
// Если прав нет — бэкенд возвращает все false.
export const fetchMyCurrencyControlPermissions = async () => {
  const { data } = await API_URL_AUTH.get(
    `${COMPLIANCE_URL}/permissions/currency-control/me`
  );
  return {
    login: data?.login ?? "",
    can_create: !!data?.can_create,
    can_edit: !!data?.can_edit,
    can_delete: !!data?.can_delete,
  };
};

// Поиск сотрудников для выдачи прав
export const searchCurrencyControlUsers = async (query) => {
  const { data } = await API_URL_AUTH.get(
    `${COMPLIANCE_URL}/permissions/currency-control/users`,
    { params: { q: query } }
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

// Обновление прав (PUT)
export const updateCurrencyControlPermission = async (login, payload) => {
  const { data } = await API_URL_AUTH.put(
    `${COMPLIANCE_URL}/permissions/currency-control/${login}`,
    {
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