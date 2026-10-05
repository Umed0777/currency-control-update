import axios from "axios";

const API_URL_AUTH = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

// ==== Интерцептор запроса: добавляем access_token ====
API_URL_AUTH.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  pendingQueue = [];
};

// ==== Сохранить токены/сессию в localStorage + уведомить стор ====
const persistTokens = (data) => {
  if (data.access_token) {
    localStorage.setItem("access_token", data.access_token);
  }
  if (data.refresh_token) {
    localStorage.setItem("refresh_token", data.refresh_token);
  }
  if (data.session) {
    localStorage.setItem("session", JSON.stringify(data.session));
    if (data.session.role) localStorage.setItem("role", data.session.role);
    if (
      data.session.branch_id !== undefined &&
      data.session.branch_id !== null
    ) {
      localStorage.setItem("branch_id", String(data.session.branch_id));
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("auth:refreshed", { detail: data })
    );
  }
};

// ==== Обновить токен через /auth/refresh (единая точка входа) ====
const doRefresh = async () => {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) throw new Error("Нет refresh токена");

  const response = await axios.post(
    `${import.meta.env.VITE_API_URL}/auth/refresh`,
    { refresh_token: refreshToken }
  );

  persistTokens(response.data);
  scheduleTokenRefresh();
  return response.data;
};

// ==== Интерцептор ответа: 401 → рефреш → повтор запроса ====
API_URL_AUTH.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const url = originalRequest.url || "";

    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/logout") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/request-access");

    // Пропускаем: не 401, auth-эндпоинт, или уже ретраили
    if (
      error.response?.status !== 401 ||
      isAuthEndpoint ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    // Если рефреш уже идёт — становимся в очередь
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return API_URL_AUTH(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const data = await doRefresh();
      processQueue(null, data.access_token);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      return API_URL_AUTH(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      const status = refreshError?.response?.status;

      if (status === 400 || status === 401 || status === 403) {
        localStorage.clear();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ==== Proactive refresh: за 1 минуту до истечения ====
let refreshTimer = null;

const base64UrlDecode = (str) => {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return atob(base64 + pad);
};

const getTokenExp = (token) => {
  try {
    const payload = JSON.parse(base64UrlDecode(token.split(".")[1]));
    return payload.exp * 1000;
  } catch (e) {
    console.warn("Не удалось распарсить JWT:", e);
    return null;
  }
};

export const scheduleTokenRefresh = () => {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  const expiresAt = getTokenExp(token);
  if (!expiresAt) return;

  const now = Date.now();
  // Минимум 5 секунд, чтобы не зациклиться
  const refreshIn = Math.max(expiresAt - now - 60_000, 5_000);

  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => refreshNow(), refreshIn);
};

const refreshNow = async () => {
  try {
    await doRefresh();
  } catch (err) {
    // Не выходим — просто попробуем ещё раз при следующем 401
    console.warn(
      "Proactive refresh failed:",
      err?.response?.status,
      err?.message
    );
  }
};

export const loginRequest = async (login, password) => {
  const response = await API_URL_AUTH.post("/auth/login", { login, password });
  return response.data;
};

export const logoutRequest = async () => {
  try {
    await API_URL_AUTH.post("/auth/logout");
  } catch (error) {
    console.error("Logout error:", error);
  }
};

export const refreshTokenRequest = async (refresh_token) => {
  const response = await API_URL_AUTH.post("/auth/refresh", { refresh_token });
  return response.data;
};

export const requestAccess = async (branch_id, role) => {
  const response = await API_URL_AUTH.post("/auth/request-access", {
    branch_id,
    role,
  });
  return response.data;
};

export const getBranches = async () => {
  const response = await API_URL_AUTH.get("/auth/branches");
  const data = response.data;
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : [];
  return list.map((b) => ({
    id: b.id ?? b.branch_id ?? b.branchId,
    name:
      b.name ??
      b.branch_name ??
      b.branchName ??
      `Филиал #${b.id ?? b.branch_id ?? "?"}`,
  }));
};

export const getRoles = async () => {
  const response = await API_URL_AUTH.get("/auth/roles");
  const data = response.data;
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : [];
};

export const getAccessRequests = async () => {
  const response = await API_URL_AUTH.get("/api/access-requests");
  return response.data;
};

export const getAccessRequestsHistory = async () => {
  const response = await API_URL_AUTH.get("/api/access-requests/history");
  return response.data;
};

export const approveAccessRequest = async (requestId) => {
  const response = await API_URL_AUTH.post(
    `/api/access-requests/${requestId}/approve`
  );
  return response.data;
};

export const rejectAccessRequest = async (requestId) => {
  const response = await API_URL_AUTH.post(
    `/api/access-requests/${requestId}/reject`
  );
  return response.data;
};

if (typeof window !== "undefined") {
  const existingToken = localStorage.getItem("access_token");
  if (existingToken) {
    setTimeout(() => scheduleTokenRefresh(), 0);
  }
}

export default API_URL_AUTH;