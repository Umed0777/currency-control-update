import API_URL_AUTH from "./auth.service";

/**
 *
 * @param {"contract"|"invoice"|"gtd"|"additional_agreement"|"payment_order"|"gtd_extension"} entityType
 * @param {number|string} id
 * @param {boolean} download 
 */
export const fetchDocumentBlob = async (entityType, id, download = false) => {
  const response = await API_URL_AUTH.get(
    `/api/documents/${entityType}/${id}/file`,
    {
      params: download ? { download: true } : {},
      responseType: "blob",
    }
  );
  return response;
};

export const getDocumentFileUrl = (entityType, id, download = false) => {
  const base = API_URL_AUTH.defaults.baseURL || "";
  const params = download ? "?download=true" : "";
  return `${base}/api/documents/${entityType}/${id}/file${params}`;
};