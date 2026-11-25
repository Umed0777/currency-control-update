import { useEffect } from "react";
import { useAuthStore } from "../store/useAuth";
import { useApprovalsStore } from "../store/useApprovalsStore";

const FULL_ROLES = ["admin", "administrator", "администратор", "compliance", "комплаенс"];

const isCurrencyControlRole = (r) =>
  ["currency_control", "валютный контроль", "vk", "вк"].includes(r) ||
  r.includes("currency") ||
  r.includes("valut") ||
  r.includes("валют");

export const useDocPermissions = () => {
  const role = useAuthStore((s) => s.role);

  const myPermissions = useApprovalsStore((s) => s.myPermissions);
  const fetchMyPermissions = useApprovalsStore((s) => s.fetchMyPermissions);

  const r = String(role || "").toLowerCase().trim();
  const isFull = FULL_ROLES.includes(r);
  const isCC = !isFull && isCurrencyControlRole(r);

  useEffect(() => {
    if (!isCC) return;
    const load = () => fetchMyPermissions().catch(() => {});
    load();                                  // при открытии страницы
    window.addEventListener("focus", load);  // при возврате на вкладку
    return () => window.removeEventListener("focus", load);
  }, [isCC, fetchMyPermissions]);

  if (isFull) return { create: true, edit: true, del: true };

  if (isCC) {
    return {
      create: !!myPermissions?.can_create,
      edit: !!myPermissions?.can_edit,
      del: !!myPermissions?.can_delete,
    };
  }

  if (r === "operator") return { create: true, edit: false, del: false };

  return { create: false, edit: false, del: false };
};

export default useDocPermissions;