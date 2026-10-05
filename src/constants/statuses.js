// === Статусы согласования ===
export const APPROVAL_STATUS_MAP = {
  pending: { label: "В ожидании", color: "gold" },
  pending_currency_control: {
    label: "На валютном контроле",
    color: "orange",
  },
  pending_compliance: {
    label: "На комплаенсе",
    color: "purple",
  },
  revision: { label: "На доработке", color: "volcano" },
  approved: { label: "Одобрено", color: "green" },
  accepted: { label: "Принято", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
  declined: { label: "Отклонено", color: "red" },
  archived: { label: "В архиве", color: "default" },
};

export const getApprovalStatusLabel = (status) => {
  if (!status) return "—";
  return APPROVAL_STATUS_MAP[status]?.label || status;
};

export const getApprovalStatusColor = (status) => {
  if (!status) return "default";
  return APPROVAL_STATUS_MAP[status]?.color || "default";
};

// === Этапы согласования ===
export const STAGE_MAP = {
  currency_control: { label: "Валютный контроль", color: "gold" },
  compliance: { label: "Комплаенс", color: "purple" },
  revision: { label: "На доработке", color: "orange" },
};

// === Типы документов ===
export const ENTITY_TYPE_MAP = {
  contract: { label: "Контракт", color: "red" },
  invoice: { label: "Инвойс", color: "blue" },
  gtd: { label: "ГТД", color: "green" },
  additional_agreement: { label: "Доп. соглашение", color: "purple" },
};