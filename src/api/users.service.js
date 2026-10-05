import API_URL_AUTH from "./auth.service";

const BASE_URL = "/api/users";

// === Список всех пользователей ===
export const getUsers = async () => {
  const { data } = await API_URL_AUTH.get(BASE_URL);
  return data;
};

// === Создание пользователя ===
export const createUser = async (payload) => {
  const { data } = await API_URL_AUTH.post(BASE_URL, {
    branch_id: payload.branch_id ? Number(payload.branch_id) : 0,
    email: payload.email?.trim() || "",
    first_name: payload.first_name?.trim() || "",
    last_name: payload.last_name?.trim() || "",
    login: payload.login?.trim() || "",
    role: payload.role || "",
  });
  return data;
};

// === Обновление роли/филиала пользователя ===
export const updateUser = async (userId, payload) => {
  const { data } = await API_URL_AUTH.put(`${BASE_URL}/${userId}`, {
    branch_id: payload.branch_id ? Number(payload.branch_id) : 0,
    role: payload.role || "",
  });
  return data;
};

// === Удаление пользователя ===
export const deleteUser = async (userId) => {
  const { data } = await API_URL_AUTH.delete(`${BASE_URL}/${userId}`);
  return data;
};