import { useEffect } from "react";
import { useAuthStore } from "../store/useAuth";
import { useApprovalsStore } from "../store/useApprovalsStore";

const toBool = (v) =>
  v === true || v === 1 || v === "yes" || v === "true" || v === "1";

export const useDocPermissions = () => {
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const permissions = useApprovalsStore((s) => s.permissions);
  const fetchPermissions = useApprovalsStore((s) => s.fetchPermissions);

  const r = String(role || "").toLowerCase();
  const isFull = ["admin", "administrator", "администратор", "compliance"].includes(r);
  const isCC = r === "currency_control";

  useEffect(() => {
    if (isCC) {
      // Пробуем обновить user, и на всякий случай тянем общий список
      refreshUser?.().catch(() => {});
      fetchPermissions?.().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCC]);

  if (isFull) return { create: true, edit: true, del: true };

  if (isCC) {
    // 1. Если в user есть права — берем их (это правильный путь)
    if (user && (user.can_create !== undefined || user.can_edit !== undefined)) {
      return {
        create: toBool(user.can_create),
        edit: toBool(user.can_edit),
        del: toBool(user.can_delete),
      };
    }

    // 2. Если в user нет, ищем в общем списке (костыль)
    const login = String(user?.login || "").toLowerCase();
    const mine = (Array.isArray(permissions) ? permissions : []).find(
      (p) => String(p?.login || "").toLowerCase() === login
    );

    return {
      create: toBool(mine?.can_create),
      edit: toBool(mine?.can_edit),
      del: toBool(mine?.can_delete),
    };
  }

  if (r === "operator") return { create: true, edit: false, del: false };

  return { create: false, edit: false, del: false };
};

export default useDocPermissions;