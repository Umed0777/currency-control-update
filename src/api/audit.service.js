import API_URL_AUTH from "./auth.service";

const buildBaseUrl = () => `/api/audit-logs`;

/**
 * Получить журнал аудита с фильтрами.
 *
 * @param {Object} params
 * @param {string} [params.user_login]  - фильтр по логину
 * @param {string} [params.action]      - фильтр по действию (LOGIN, CREATE, UPDATE, DELETE)
 * @param {string} [params.entity]      - фильтр по сущности (contract, invoice, company, branch)
 * @param {number} [params.branch_id]   - фильтр по ID филиала
 * @param {string} [params.from_date]   - YYYY-MM-DD
 * @param {string} [params.to_date]     - YYYY-MM-DD
 * @param {number} [params.limit=50]    - лимит записей
 * @param {number} [params.offset=0]    - смещение
 */
export const getAuditLogs = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  );

  const { data } = await API_URL_AUTH.get(buildBaseUrl(), {
    params: cleanParams,
  });
  return data;
};