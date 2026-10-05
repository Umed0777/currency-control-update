import API_URL_AUTH from "./auth.service";

/**
 *
 * @param {Object} params
 * @param {"mine"|"all"} [params.scope="mine"]
 * @param {string} [params.status]      - all | pending_currency_control | pending_compliance | revision_required | approved | rejected
 * @param {string} [params.entity_type] - all | contract | invoice | gtd | additional_agreement
 * @param {number} [params.page=1]
 * @param {number} [params.page_size=20]
 */
export const getMyDocuments = async (params = {}) => {
  const query = {};

  if (params.scope) query.scope = params.scope;
  if (params.status && params.status !== "all") query.status = params.status;
  if (params.entity_type && params.entity_type !== "all")
    query.entity_type = params.entity_type;
  if (params.page) query.page = params.page;
  if (params.page_size) query.page_size = params.page_size;

  const { data } = await API_URL_AUTH.get("/api/my/documents", {
    params: query,
  });
  return data;
};