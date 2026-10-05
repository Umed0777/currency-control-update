import API_URL_AUTH from "./auth.service";

/**
 * GET /api/trash
 * Список удалённых документов (контракты, доп. соглашения, инвойсы, ГТД).
 *
 * @param {Object} params
 * @param {string} [params.entity_type] - contract | additional_agreement | invoice | gtd
 * @param {number} [params.branch_id]
 * @param {string} [params.search]      - номер документа или контрагент
 * @param {number} [params.page=1]
 * @param {number} [params.page_size=20] - max 100
 */
export const getTrashList = async (params = {}) => {
  const query = {};

  if (params.entity_type) query.entity_type = params.entity_type;
  if (params.branch_id) query.branch_id = params.branch_id;
  if (params.search) query.search = params.search;
  if (params.page) query.page = params.page;
  if (params.page_size) query.page_size = params.page_size;

  const response = await API_URL_AUTH.get("/api/trash", { params: query });
  return response.data;
};

export const getTrashDetail = async (entityType, id) => {
  const response = await API_URL_AUTH.get(
    `/api/trash/${entityType}/${id}`
  );
  return response.data;
};

export const getTrashFile = async (entityType, id) => {
  const response = await API_URL_AUTH.get(
    `/api/trash/${entityType}/${id}/file`,
    { responseType: "blob" }
  );
  return response;
};

export const restoreTrashItem = async (entityType, id) => {
  const response = await API_URL_AUTH.post(
    `/api/trash/${entityType}/${id}/restore`
  );
  return response.data;
};