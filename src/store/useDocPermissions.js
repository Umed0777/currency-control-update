import { useEffect } from "react";
import { useAuthStore } from "../store/useAuth";
import { useApprovalsStore } from "../store/useApprovalsStore";

const toBool = (v) =>
  v === true || v === 1 || v === "yes" || v === "true" || v === "1";

const FULL_ROLES = ["admin", "administrator", "администратор", "compliance", "комплаенс"];
const CC_ROLES = ["currency_control", "валютный контроль"];

export const useDocPermissions = () => {
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);

  const permissions = useApprovalsStore((s) => s.permissions);
  const fetchPermissions = useApprovalsStore((s) => s.fetchPermissions);

  const r = String(role || "").toLowerCase();
  const isFull = FULL_ROLES.includes(r);
  const isCC = CC_ROLES.includes(r);

  useEffect(() => {
    if (isCC) fetchPermissions?.().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCC]);

  if (isFull) return { create: true, edit: true, del: true };

  if (isCC) {
    const login = String(user?.login || "").toLowerCase();

    // 1. Свежий список — главный источник
    const mine = (Array.isArray(permissions) ? permissions : []).find(
      (p) => String(p?.login || "").toLowerCase() === login,
    );
    if (mine) {
      return {
        create: toBool(mine.can_create),
        edit: toBool(mine.can_edit),
        del: toBool(mine.can_delete),
      };
    }

    // 2. Запасной вариант — поля в user (могут быть устаревшими)
    if (user && (user.can_create !== undefined || user.can_edit !== undefined)) {
      return {
        create: toBool(user.can_create),
        edit: toBool(user.can_edit),
        del: toBool(user.can_delete),
      };
    }

    return { create: false, edit: false, del: false };
  }

  if (r === "operator") return { create: true, edit: false, del: false };

  return { create: false, edit: false, del: false };
};

export default useDocPermissions;