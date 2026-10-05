import API_URL_AUTH from "./auth.service";

export const getBranchesAll = async () => {
  try {
    const response = await API_URL_AUTH.get("/api/branches/all");
    return response.data;
  } catch (error) {
    console.error("getBranchesAll:", error);
    throw error;
  }
};

export const getBranchById = async (branchId) => {
  try {
    const response = await API_URL_AUTH.get(`/api/branches/${branchId}`);
    return response.data;
  } catch (error) {
    console.error("getBranchById:", error);
    throw error;
  }
};

export const createBranch = async (id, name) => {
  try {
    const response = await API_URL_AUTH.post("/api/branches", {
      id: Number(id),
      name: name.trim(),
    });
    return response.data;
  } catch (error) {
    console.error("createBranch:", error);
    throw error;
  }
};

export const updateBranch = async (branchId, name) => {
  try {
    const response = await API_URL_AUTH.put(`/api/branches/${branchId}`, {
      name: name.trim(),
    });
    return response.data;
  } catch (error) {
    console.error("updateBranch:", error);
    throw error;
  }
};

export const deleteBranch = async (branchId) => {
  try {
    const response = await API_URL_AUTH.delete(`/api/branches/${branchId}`);
    return response.data;
  } catch (error) {
    console.error("deleteBranch:", error);
    throw error;
  }
};