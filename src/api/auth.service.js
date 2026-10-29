import axios from "axios";

const API_URL_AUTH = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

// =====================================================
// REQUEST INTERCEPTOR: добавляем access_token
// =====================================================

API_URL_AUTH.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =====================================================
// REFRESH QUEUE
// =====================================================

let isRefreshing = false;
let refreshPromise = null;
let pendingQueue = [];
let refreshTimer = null;

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  pendingQueue = [];
};

// =====================================================
// CLEAR AUTH DATA
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

// =====================================================
// SAVE TOKENS AND SESSION
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

    if (data.session.role != null) {
      localStorage.setItem("role", data.session.role);
    }

    if (data.session.branch_id != null) {
      localStorage.setItem(
        "branch_id",
        String(data.session.branch_id)
      );
    }
  }

  if (data.login) {
    localStorage.setItem("login", data.login);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("auth:refreshed", {
        detail: data,
      })
    );
  }
};

// =====================================================
// JWT EXPIRATION
// =====================================================

const base64UrlDecode = (str) => {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");

  const padding =
    base64.length % 4 === 0
      ? ""
      : "=".repeat(4 - (base64.length % 4));

  return atob(base64 + padding);
};

const getTokenExp = (token) => {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(parts[1]));

    if (typeof payload.exp !== "number") {
      return null;
    }

    return payload.exp * 1000;
  } catch (error) {
    console.warn("Не удалось прочитать срок действия JWT:", error);
    return null;
  }
};

// =====================================================
// REFRESH TOKEN
// Все одновременные запросы используют один refresh
// =====================================================

const doRefresh = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
      throw new Error("Нет refresh токена");
    }

    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/auth/refresh`,
      {
        refresh_token: refreshToken,
      },
      {
        timeout: 10000,
      }
    );

    const data = response.data;

    if (!data?.access_token) {
      throw new Error(
        "Сервер не вернул новый access_token"
      );
    }

    persistTokens(data);

    return data;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

// =====================================================
// SCHEDULE AUTOMATIC TOKEN REFRESH
// Обновляем access_token за 60 секунд до истечения
// =====================================================

export const scheduleTokenRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const token = localStorage.getItem("access_token");

  if (!token) {
    return;
  }

  const expiresAt = getTokenExp(token);

  if (!expiresAt) {
    console.warn("Не удалось определить срок действия access_token");
    return;
  }

  const now = Date.now();

  // Если токен уже истёк, пытаемся обновить его сразу.
  // Если до истечения меньше минуты — также обновляем сразу.
  const refreshIn = Math.max(expiresAt - now - 60_000, 0);

  refreshTimer = setTimeout(() => {
    refreshNow();
  }, refreshIn);
};

// =====================================================
// PROACTIVE REFRESH
// =====================================================

const refreshNow = async () => {
  try {
    await doRefresh();

    scheduleTokenRefresh();
  } catch (error) {
    const status = error?.response?.status;

    console.error("Token refresh failed:", {
      status,
      message:
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message,
    });

    // Удаляем авторизацию только если сервер
    // явно отклонил refresh-токен.
    if ([400, 401, 403].includes(status)) {
      clearAuthData();

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.replace("/login");
      }

      return;
    }

    // При временной сетевой ошибке не удаляем токены.
    // Повторяем попытку через 15 секунд.
    if (localStorage.getItem("refresh_token")) {
      refreshTimer = setTimeout(() => {
        refreshNow();
      }, 15_000);
    }
  }
};

// =====================================================
// RESPONSE INTERCEPTOR
// 401 -> refresh -> повтор исходного запроса
// =====================================================

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

    if (
      error.response?.status !== 401 ||
      isAuthEndpoint ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    // Если refresh уже выполняется, ждём его завершения.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;

          return API_URL_AUTH(originalRequest);
        })
        .catch((refreshError) => Promise.reject(refreshError));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const data = await doRefresh();
      const newAccessToken = data.access_token;

      processQueue(null, newAccessToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      scheduleTokenRefresh();

      return API_URL_AUTH(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      const status = refreshError?.response?.status;

      if ([400, 401, 403].includes(status)) {
        clearAuthData();

        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          window.location.replace("/login");
        }
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// =====================================================
// AUTH API
// =====================================================

export const loginRequest = async (login, password) => {
  const response = await API_URL_AUTH.post("/auth/login", {
    login,
    password,
  });

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
    `${import.meta.env.VITE_API_URL}/auth/refresh`,
    {
      refresh_token,
    },
    {
      timeout: 10000,
    }
  );

  return response.data;
};

export const requestAccess = async (branch_id, role) => {
  const response = await API_URL_AUTH.post("/auth/request-access", {
    branch_id,
    role,
  });

  return response.data;
};

// =====================================================
// BRANCHES
// =====================================================

export const getBranches = async () => {
  const response = await API_URL_AUTH.get("/auth/branches");
  const data = response.data;

  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];

  return list.map((branch) => ({
    id: branch.id ?? branch.branch_id ?? branch.branchId,

    name:
      branch.name ??
      branch.branch_name ??
      branch.branchName ??
      `Филиал #${branch.id ?? branch.branch_id ?? "?"}`,
  }));
};

// =====================================================
// ROLES
// =====================================================

export const getRoles = async () => {
  const response = await API_URL_AUTH.get("/auth/roles");
  const data = response.data;

  return Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];
};

// =====================================================
// ACCESS REQUESTS
// =====================================================

export const getAccessRequests = async () => {
  const response = await API_URL_AUTH.get("/api/access-requests");

  return response.data;
};

export const getAccessRequestsHistory = async () => {
  const response = await API_URL_AUTH.get(
    "/api/access-requests/history"
  );

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

// =====================================================
// INITIALIZE TOKEN REFRESH
// =====================================================

if (typeof window !== "undefined") {
  const existingToken = localStorage.getItem("access_token");

  if (existingToken) {
    setTimeout(() => {
      scheduleTokenRefresh();
    }, 0);
  }

  // Если Zustand обновляет или очищает сессию,
  // таймер синхронизируется с изменениями авторизации.
  window.addEventListener("auth:logout", () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  });
}

export default API_URL_AUTH;