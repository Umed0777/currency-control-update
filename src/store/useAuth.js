import { create } from "zustand";
import {
  loginRequest,
  logoutRequest,
  requestAccess as requestAccessApi,
  getRoles as getRolesApi,
  getAccessRequests as getAccessRequestsApi,
  getAccessRequestsHistory as getAccessRequestsHistoryApi,
  approveAccessRequest as approveAccessRequestApi,
  rejectAccessRequest as rejectAccessRequestApi,
  scheduleTokenRefresh,
  getMe, // ⬅️ ДОБАВЛЕНО
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

// Хелпер: безопасно превращает значение в boolean
const toBool = (v) =>
  v === true || v === 1 || v === "yes" || v === "true" || v === "1";

const storedSession = JSON.parse(localStorage.getItem("session") || "null");

export const useAuthStore = create((set, get) => {
  // Слушаем события обновления токена
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
          // ⬇️ Восстанавливаем права из localStorage
          can_create: toBool(localStorage.getItem("can_create")),
          can_edit: toBool(localStorage.getItem("can_edit")),
          can_delete: toBool(localStorage.getItem("can_delete")),
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

        // ⬇️ Сохраняем права (на верхнем уровне или внутри session)
        const can_create = toBool(
          data.can_create ?? data.session?.can_create,
        );
        const can_edit = toBool(data.can_edit ?? data.session?.can_edit);
        const can_delete = toBool(
          data.can_delete ?? data.session?.can_delete,
        );

        localStorage.setItem("can_create", String(can_create));
        localStorage.setItem("can_edit", String(can_edit));
        localStorage.setItem("can_delete", String(can_delete));

        set({
          user: {
            ...data,
            can_create,
            can_edit,
            can_delete,
          },
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

    // ⬇️ НОВЫЙ МЕТОД: обновить данные пользователя (в т.ч. права)
    refreshUser: async () => {
      try {
        const data = await getMe();

        const can_create = toBool(
          data.can_create ?? data.session?.can_create,
        );
        const can_edit = toBool(data.can_edit ?? data.session?.can_edit);
        const can_delete = toBool(
          data.can_delete ?? data.session?.can_delete,
        );

        localStorage.setItem("can_create", String(can_create));
        localStorage.setItem("can_edit", String(can_edit));
        localStorage.setItem("can_delete", String(can_delete));

        set((state) => ({
          user: {
            ...(state.user || {}),
            ...data,
            can_create,
            can_edit,
            can_delete,
          },
          role: data.role || state.role,
        }));

        return { success: true, data };
      } catch (err) {
        console.error("refreshUser error:", err);
        return { success: false };
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
        set({ accessRequestsHistory: historyData, loading: false, error: null });
        return { success: true, data: historyData };
      } catch (error) {
        const message = extractError(
          error,
          "Не удалось загрузить историю запросов",
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
            (item) => String(item.id) !== String(requestId),
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
            (item) => String(item.id) !== String(requestId),
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