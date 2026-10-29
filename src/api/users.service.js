import API_URL_AUTH from "./auth.service";

const BASE_URL = "/api/users";

export const getUsers = async () => {
  const { data } = await API_URL_AUTH.get(BASE_URL);
  return data;
};

export const createUser = async (payload) => {
  const { data } = await API_URL_AUTH.post(BASE_URL, {
    branch_id: Number(payload.branch_id) || 0,
    login: payload.login?.trim() || "",
    role: payload.role || "",
  });

  return data;
};

export const updateUser = async (userId, payload) => {
  const { data } = await API_URL_AUTH.put(
    `${BASE_URL}/${userId}`,
    {
      branch_id: Number(payload.branch_id) || 0,
      role: payload.role || "",
    }
  );

  return data;
};

export const deleteUser = async (userId) => {
  const { data } = await API_URL_AUTH.delete(
    `${BASE_URL}/${userId}`
  );

  return data;
};