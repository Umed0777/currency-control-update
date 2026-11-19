import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

const API_URL_AUTH = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

const REFRESH_BEFORE_MS = 60_000; // обновлять за 60 сек до истечения
const EXPIRY_SKEW_MS = 10_000; // считать токен просроченным за 10 сек до exp
const RETRY_DELAY_MS = 15_000; // повтор, если обновление упало из-за сети

// =====================================================
// ДЕКОДИРОВАНИЕ JWT (для проверки срока)
// =====================================================
const base64UrlDecode = (str) => {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return atob(base64 + padding);
};

const getTokenExp = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch (error) {
    console.warn("Не удалось прочитать срок действия JWT:", error);
    return null;
  }
};

// Токен ещё годен? (если срок прочитать нельзя — не блокируем запрос)
const isTokenFresh = (token) => {
  const exp = getTokenExp(token);
  return !exp || exp - Date.now() > EXPIRY_SKEW_MS;
};

// =====================================================
// STATE
// =====================================================
let refreshPromise = null;
let refreshTimer = null;

const authError = (message) => Object.assign(new Error(message), { isAuthError: true });

// Разлогин нужен ТОЛЬКО если сервер отклонил refresh_token.
// Сеть, таймаут, 5xx — это НЕ повод показывать логин.
const isAuthFailure = (error) => {
  if (error?.isAuthError) return true;
  const status = error?.response?.status;
  return status === 400 || status === 401 || status === 403;
};

const isAuthEndpoint = (url = "") =>
  url.includes("/auth/login") ||
  url.includes("/auth/logout") ||
  url.includes("/auth/refresh") ||
  url.includes("/auth/request-access");

// =====================================================
// ОЧИСТКА ДАННЫХ
// =====================================================
const clearAuthData = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("session");
  localStorage.removeItem("role");
  localStorage.removeItem("branch_id");
  localStorage.removeItem("login");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }
};

const forceLogout = () => {
  clearAuthData();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

// =====================================================
// СОХРАНЕНИЕ ТОКЕНОВ
// =====================================================
const persistTokens = (data) => {
  if (data.access_token) {
    localStorage.setItem("access_token", data.access_token);
  }
  if (data.refresh_token) {
    localStorage.setItem("refresh_token", data.refresh_token);
  }
  if (data.session) {
    localStorage.setItem("session", JSON.stringify(data.session));
    if (data.session.role != null) localStorage.setItem("role", data.session.role);
    if (data.session.branch_id != null) localStorage.setItem("branch_id", String(data.session.branch_id));
  }
  if (data.login) {
    localStorage.setItem("login", data.login);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:refreshed", { detail: data }));
  }
};

// =====================================================
// ОБНОВЛЕНИЕ ТОКЕНА (ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ)
// Все вызовы делят один запрос. Здесь НЕТ разлогина —
// решение принимают вызывающие, смотря на тип ошибки.
// =====================================================
const doRefresh = () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) throw authError("Нет refresh токена");

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: 10000 }
      );

      if (!data?.access_token) throw authError("Сервер не вернул новый access_token");

      persistTokens(data);
      return data;
    } catch (error) {
      // Другая вкладка могла уже обновить токены (refresh_token одноразовый)
      const currentRefresh = localStorage.getItem("refresh_token");
      const currentAccess = localStorage.getItem("access_token");
      if (
        currentRefresh &&
        currentRefresh !== refreshToken &&
        currentAccess &&
        isTokenFresh(currentAccess)
      ) {
        window.dispatchEvent(
          new CustomEvent("auth:refreshed", { detail: { access_token: currentAccess } })
        );
        return { access_token: currentAccess };
      }
      throw error;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

// =====================================================
// ПЛАНИРОВЩИК ОБНОВЛЕНИЙ
// =====================================================
export const scheduleTokenRefresh = (delayOverride) => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const token = localStorage.getItem("access_token");
  if (!token) return;

  const expiresAt = getTokenExp(token);
  if (!expiresAt) {
    console.warn("Не удалось определить срок действия access_token");
    return;
  }

  const delay =
    typeof delayOverride === "number"
      ? delayOverride
      : Math.max(expiresAt - Date.now() - REFRESH_BEFORE_MS, 0);

  refreshTimer = setTimeout(refreshNow, delay);
};

const refreshNow = async () => {
  try {
    await doRefresh();
    scheduleTokenRefresh();
  } catch (error) {
    if (isAuthFailure(error)) {
      forceLogout(); // refresh_token не принят — только тогда на /login
    } else {
      console.warn("Не удалось обновить токен (сеть/сервер), повтор через 15 сек:", error?.message);
      scheduleTokenRefresh(RETRY_DELAY_MS);
    }
  }
};

// =====================================================
// REQUEST INTERCEPTOR
// Если токен истёк — ОБНОВЛЯЕМ его, а не разлогиниваем
// =====================================================
API_URL_AUTH.interceptors.request.use(async (config) => {
  let token = localStorage.getItem("access_token");

  if (token && !isAuthEndpoint(config.url) && !isTokenFresh(token)) {
    try {
      const data = await doRefresh();
      token = data.access_token;
      scheduleTokenRefresh();
    } catch (error) {
      if (isAuthFailure(error)) forceLogout();
      return Promise.reject(error);
    }
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// =====================================================
// RESPONSE INTERCEPTOR (ОБРАБОТКА 401)
// =====================================================
API_URL_AUTH.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    if (
      error.response?.status !== 401 ||
      isAuthEndpoint(originalRequest.url) ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Параллельные 401 делят один refresh-запрос (см. doRefresh)
      const data = await doRefresh();
      scheduleTokenRefresh();

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      return API_URL_AUTH(originalRequest);
    } catch (refreshError) {
      if (isAuthFailure(refreshError)) forceLogout();
      return Promise.reject(refreshError);
    }
  }
);

// =====================================================
// API ЭКСПОРТЫ
// =====================================================
export const loginRequest = async (login, password) => {
  const response = await API_URL_AUTH.post("/auth/login", { login, password });
  return response.data;
};

export const logoutRequest = async () => {
  try {
    await API_URL_AUTH.post("/auth/logout");
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    clearAuthData();
  }
};

export const refreshTokenRequest = async (refresh_token) => {
  const response = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refresh_token },
    { timeout: 10000 }
  );
  return response.data;
};

export const requestAccess = async (branch_id, role) => {
  const response = await API_URL_AUTH.post("/auth/request-access", { branch_id, role });
  return response.data;
};

export const getBranches = async () => {
  const response = await API_URL_AUTH.get("/auth/branches");
  const data = response.data;
  const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return list.map((branch) => ({
    id: branch.id ?? branch.branch_id ?? branch.branchId,
    name: branch.name ?? branch.branch_name ?? branch.branchName ?? `Филиал #${branch.id ?? branch.branch_id ?? "?"}`,
  }));
};

export const getRoles = async () => {
  const response = await API_URL_AUTH.get("/auth/roles");
  const data = response.data;
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
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
  const response = await API_URL_AUTH.post(`/api/access-requests/${requestId}/approve`);
  return response.data;
};

export const rejectAccessRequest = async (requestId) => {
  const response = await API_URL_AUTH.post(`/api/access-requests/${requestId}/reject`);
  return response.data;
};

// =====================================================
// ИНИЦИАЛИЗАЦИЯ
// =====================================================
if (typeof window !== "undefined") {
  if (localStorage.getItem("access_token")) {
    setTimeout(() => scheduleTokenRefresh(), 0);
  }

  // После сна ноутбука / фоновой вкладки таймер мог сбиться — проверяем при возврате
  const onWake = () => {
    if (document.visibilityState !== "visible") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const exp = getTokenExp(token);
    if (exp && exp - Date.now() < REFRESH_BEFORE_MS) {
      refreshNow();
    } else {
      scheduleTokenRefresh();
    }
  };
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("focus", onWake);

  // Синхронизация между вкладками
  window.addEventListener("storage", (e) => {
    if (e.key !== "access_token") return;
    if (e.newValue) {
      scheduleTokenRefresh();
      window.dispatchEvent(
        new CustomEvent("auth:refreshed", { detail: { access_token: e.newValue } })
      );
    } else {
      // в другой вкладке вышли из системы
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }
  });

  window.addEventListener("auth:logout", () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  });
}
export const getMe = async () => {
  const response = await API_URL_AUTH.get("/api/auth/me");
  return response.data;
};
export default API_URL_AUTH;