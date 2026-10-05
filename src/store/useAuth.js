import { create } from "zustand";
import {
  loginRequest,
  logoutRequest,
  refreshTokenRequest,
  requestAccess as requestAccessApi,
  getRoles as getRolesApi,
  getAccessRequests as getAccessRequestsApi,
  getAccessRequestsHistory as getAccessRequestsHistoryApi,
  approveAccessRequest as approveAccessRequestApi,
  rejectAccessRequest as rejectAccessRequestApi,
  scheduleTokenRefresh,
} from "../api/auth.service";

const extractError = (error, fallback = "Произошла ошибка") => {
  return (
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.response?.data?.detail ||
    (typeof error.response?.data === "string" ? error.response.data : null) ||
    fallback
  );
};

const storedSession = JSON.parse(localStorage.getItem("session") || "null");

export const useAuthStore = create((set, get) => {
  if (typeof window !== "undefined") {
    window.addEventListener("auth:refreshed", (e) => {
      const data = e.detail || {};
      set({
        accessToken: data.access_token ?? get().accessToken,
        refreshToken: data.refresh_token ?? get().refreshToken,
        session: data.session ?? get().session,
        role: data.session?.role ?? get().role,
        branchId:
          data.session?.branch_id !== undefined
            ? data.session.branch_id
            : get().branchId,
      });
    });

    if (localStorage.getItem("access_token")) {
      scheduleTokenRefresh();
    }
  }

  return {
    user: storedSession
      ? {
          login: storedSession.login,
          last_name: storedSession.last_name,
          first_name: storedSession.first_name,
          email: storedSession.email,
          session: storedSession,
        }
      : null,
    accessToken: localStorage.getItem("access_token"),
    refreshToken: localStorage.getItem("refresh_token"),
    session: JSON.parse(localStorage.getItem("session") || "null"),
    role: localStorage.getItem("role"),
    branchId: localStorage.getItem("branch_id")
      ? Number(localStorage.getItem("branch_id"))
      : null,
    roles: [],
    accessRequests: [],
    accessRequestsHistory: [],
    loading: false,
    error: null,

    login: async (login, password) => {
      set({ loading: true, error: null });
      try {
        const data = await loginRequest(login, password);

        if (data.access_token)
          localStorage.setItem("access_token", data.access_token);
        if (data.refresh_token)
          localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("login", data.login || login);

        const role = data.role || data.session?.role || null;
        const branchId = data.branch_id ?? data.session?.branch_id ?? null;

        if (role) localStorage.setItem("role", role);
        if (branchId !== null && branchId !== undefined) {
          localStorage.setItem("branch_id", String(branchId));
        }
        if (data.session)
          localStorage.setItem("session", JSON.stringify(data.session));

        set({
          user: data,
          accessToken: data.access_token || null,
          refreshToken: data.refresh_token || null,
          session: data.session || null,
          role,
          branchId,
          loading: false,
          error: null,
        });
        scheduleTokenRefresh();

        return { success: true, data };
      } catch (error) {
        const message = extractError(error, "Неверный логин или пароль");
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    refreshSession: async () => {
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("Нет refresh токена");

        const data = await refreshTokenRequest(refreshToken);

        const newRole = data.role || data.session?.role || null;
        const newBranchId = data.branch_id ?? data.session?.branch_id ?? null;

        if (data.access_token)
          localStorage.setItem("access_token", data.access_token);
        if (data.refresh_token)
          localStorage.setItem("refresh_token", data.refresh_token);
        if (data.session)
          localStorage.setItem("session", JSON.stringify(data.session));
        if (newRole) localStorage.setItem("role", newRole);
        if (newBranchId !== null && newBranchId !== undefined) {
          localStorage.setItem("branch_id", String(newBranchId));
        }

        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          session: data.session,
          role: newRole,
          branchId: newBranchId,
          loading: false,
        });

        scheduleTokenRefresh();

        if (newRole && newRole !== "pre_auth") {
          // ✅ Всегда ведём на HomePage
          const targetUrl = "/";

          setTimeout(() => {
            window.location.replace(targetUrl);
          }, 100);

          return {
            success: true,
            message: "Заявка одобрена! Входим в систему...",
          };
        }

        return { success: false, message: "Заявка еще на рассмотрении" };
      } catch (error) {
        console.error("Refresh session error:", error);
        const status = error.response?.status;

        if (status === 400 || status === 401 || status === 403) {
          localStorage.clear();
          window.location.replace("/login");
        }

        return { success: false, message: "Ошибка проверки статуса" };
      }
    },

    requestAccess: async (branch_id, role) => {
      set({ loading: true, error: null });
      try {
        const data = await requestAccessApi(branch_id, role);
        set({ loading: false, error: null });
        return { success: true, data };
      } catch (error) {
        const message = extractError(error, "Не удалось запросить доступ");
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    getRoles: async () => {
      set({ loading: true, error: null });
      try {
        const data = await getRolesApi();
        const rolesData = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
        set({ roles: rolesData, loading: false, error: null });
        return { success: true, data: rolesData };
      } catch (error) {
        const message = extractError(error, "Не удалось загрузить роли");
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    getAccessRequests: async () => {
      set({ loading: true, error: null });
      try {
        const data = await getAccessRequestsApi();
        const requestsData = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
        set({ accessRequests: requestsData, loading: false, error: null });
        return { success: true, data: requestsData };
      } catch (error) {
        const message = extractError(error, "Не удалось загрузить заявки");
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    getAccessRequestsHistory: async () => {
      set({ loading: true, error: null });
      try {
        const data = await getAccessRequestsHistoryApi();
        const historyData = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
        set({
          accessRequestsHistory: historyData,
          loading: false,
          error: null,
        });
        return { success: true, data: historyData };
      } catch (error) {
        const message = extractError(
          error,
          "Не удалось загрузить историю запросов"
        );
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    approveAccessRequest: async (requestId) => {
      set({ loading: true, error: null });
      try {
        const data = await approveAccessRequestApi(requestId);
        set((state) => ({
          accessRequests: state.accessRequests.filter(
            (item) => String(item.id) !== String(requestId)
          ),
          loading: false,
          error: null,
        }));
        return { success: true, data };
      } catch (error) {
        const message = extractError(error, "Не удалось одобрить заявку");
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    rejectAccessRequest: async (requestId) => {
      set({ loading: true, error: null });
      try {
        const data = await rejectAccessRequestApi(requestId);
        set((state) => ({
          accessRequests: state.accessRequests.filter(
            (item) => String(item.id) !== String(requestId)
          ),
          loading: false,
          error: null,
        }));
        return { success: true, data };
      } catch (error) {
        const message = extractError(error, "Не удалось отклонить заявку");
        set({ loading: false, error: message });
        return { success: false, error: message };
      }
    },

    logout: async () => {
      try {
        await logoutRequest();
      } catch (error) {
        console.error("Logout API error:", error);
      } finally {
        localStorage.clear();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          session: null,
          role: null,
          branchId: null,
          roles: [],
          accessRequests: [],
          accessRequestsHistory: [],
          loading: false,
          error: null,
        });
        window.location.replace("/login");
      }
    },
  };
});