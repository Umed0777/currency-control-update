import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Space,
  Card,
  Typography,
  Tag,
  Empty,
  Spin,
  message,
  Row,
  Col,
  Tooltip,
  Modal,
  Form,
  Select,
  Input,
  Badge,
  Descriptions,
  Divider,
  Tabs,
  DatePicker,
  Alert,
  Pagination,
} from "antd";

import {
  AuditOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  EyeOutlined,
  FileTextOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  KeyOutlined,
  DeleteOutlined,
  PlusOutlined,
  FieldTimeOutlined,
  CloseOutlined,
  EditOutlined,
  CreditCardOutlined,
  GlobalOutlined,
  CalendarOutlined,
  SendOutlined,
  UserOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileProtectOutlined,
  FileAddOutlined,
} from "@ant-design/icons";

import debounce from "lodash/debounce";
import { useApprovalsStore } from "../store/useApprovalsStore";
import { useAuthStore } from "../store/useAuth";
import DocumentLink from "../pages/DocumentLink";

const { Title, Text } = Typography;
const { TextArea } = Input;

const RED = "#8b0000";
const GREEN = "#389e0d";
const ORANGE = "#fa8c16";
const PURPLE = "#722ed1"; // Комплаенс
const BLUE = "#1677ff"; // Валютный контроль

// ============================================================
// ТИПЫ ДОКУМЕНТОВ (теперь включая контракты и доп. соглашения)
// ============================================================
const ENTITY_TYPE_MAP = {
  contract: { label: "Контракт", color: "red" },
  invoice: { label: "Инвойс", color: "blue" },
  gtd: { label: "ГТД", color: "green" },
  additional_agreement: { label: "Доп. соглашение", color: "purple" },
  payment_order: { label: "Платёжное поручение", color: "cyan" },
};

// Разрешаем показывать контракты и доп. соглашения
const ALLOWED_ENTITY_TYPES = [
  "gtd",
  "payment_order",
  "contract",
  "additional_agreement",
];

// Варианты фильтра «Тип документа»
const ENTITY_TYPE_FILTER_OPTIONS = [
  { value: "", label: "Все документы" },
  ...ALLOWED_ENTITY_TYPES.map((value) => ({
    value,
    label: ENTITY_TYPE_MAP[value].label,
  })),
];

// ============================================================
// СТАТУСЫ
// ============================================================
const STATUS_MAP = {
  pending: { label: "В ожидании", color: "gold" },
  pending_currency_control: {
    label: "На валютном контроле",
    color: "orange",
  },
  pending_compliance: { label: "На комплаенсе", color: "purple" },
  revision: { label: "На доработке", color: "volcano" },
  revision_required: { label: "Требуется доработка", color: "volcano" },
  approved: { label: "Одобрено", color: "green" },
  accepted: { label: "Принято", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
  declined: { label: "Отклонено", color: "red" },
  archived: { label: "В архиве", color: "default" },
};

const DELIVERY_STATUS_MAP = {
  early: { label: "Раньше срока", color: "green" },
  on_time: { label: "В срок", color: "blue" },
  ontime: { label: "В срок", color: "blue" },
  late: { label: "С опозданием", color: "red" },
  overdue: { label: "Просрочено", color: "red" },
};

const DECISION_MAP = {
  approve: { label: "Принято", color: "green" },
  approved: { label: "Принято", color: "green" },
  accepted: { label: "Принято", color: "green" },
  reject: { label: "Отказано", color: "red" },
  rejected: { label: "Отказано", color: "red" },
  declined: { label: "Отказано", color: "red" },
  revision: { label: "На доработке", color: "orange" },
  revision_required: { label: "Требуется доработка", color: "orange" },
};

const humanize = (v) => {
  if (!v) return "—";
  const s = String(v).replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const getStatusInfo = (status) =>
  STATUS_MAP[status] || { label: humanize(status), color: "default" };

const getDecisionInfo = (decision) =>
  DECISION_MAP[decision] || { label: humanize(decision), color: "default" };

const STAGE_STATUSES = {
  compliance: ["pending_compliance"],
  currency_control: ["pending_currency_control"],
  revision: ["revision", "revision_required"],
};

const matchesStage = (record, stage) => {
  if (!stage) return true;
  const statuses = STAGE_STATUSES[stage];
  if (!statuses) return true;
  return statuses.includes(record.approval_status);
};

const API_DECISION = {
  compliance: {
    approve: "approve",
    revision: "revision",
    reject: "reject",
  },
  currency_control: {
    approve: "accepted",
    revision: "revision",
    reject: "rejected",
  },
};

const DECISION_ACTIONS = {
  approve: {
    label: "Принято",
    icon: <CheckOutlined />,
    color: GREEN,
    needsComment: false,
  },
  reject: {
    label: "Отказ",
    icon: <CloseOutlined />,
    color: RED,
    needsComment: true,
  },
  revision: {
    label: "На доработку",
    icon: <EditOutlined />,
    color: ORANGE,
    needsComment: true,
  },
};

const COMPLIANCE_REVISION_ENABLED = true;

const DECISION_STAGE_LABEL = {
  compliance: "Комплаенс",
  currency_control: "Валютный контроль",
};

const DECISION_SUCCESS_TEXT = {
  approve: "документ принят",
  reject: "документ отклонён",
  revision: "документ отправлен на доработку",
};

const YES_NO_OPTIONS = [
  { value: "yes", label: "Да" },
  { value: "no", label: "Нет" },
];

const ADMIN_ROLES = ["admin", "administrator", "администратор"];
const COMPLIANCE_ROLES = ["compliance", "комплаенс"];
const CURRENCY_CONTROL_ROLES = ["currency_control", "валютный контроль"];

const formatDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateShort = (v) => {
  if (!v) return "—";
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(v))) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (v, currency) => {
  if (v === null || v === undefined || v === "") return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return String(v);
  return `${num.toLocaleString("ru-RU")} ${currency || ""}`.trim();
};

const getPersonName = (p) => {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
};

const cleanErrorText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    const s = value.trim();
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        return cleanErrorText(JSON.parse(s)) || s;
      } catch {
        return s;
      }
    }
    return s;
  }
  if (Array.isArray(value)) {
    return value.map(cleanErrorText).filter(Boolean).join("; ");
  }
  if (typeof value === "object") {
    const direct = value.error ?? value.detail ?? value.message;
    if (direct !== undefined && direct !== null) {
      return cleanErrorText(direct);
    }
    return Object.values(value).map(cleanErrorText).filter(Boolean).join("; ");
  }
  return String(value);
};

const errorText = (e, fallback) =>
  cleanErrorText(e?.response?.data) ||
  (!e?.response && e?.message) ||
  fallback;

const renderDecision = (decision) => {
  if (!decision) return "—";
  const info = getDecisionInfo(decision);
  return (
    <Tag color={info.color} style={{ borderRadius: 6, margin: 0 }}>
      {info.label}
    </Tag>
  );
};

const dash = <Text type="secondary">—</Text>;

const renderDeliveryStatus = (v) => {
  if (!v) return dash;
  const info = DELIVERY_STATUS_MAP[v] || { label: humanize(v), color: "default" };
  return (
    <Tag color={info.color} style={{ borderRadius: 8, margin: 0 }}>
      {info.label}
    </Tag>
  );
};

const renderDaysDifference = (v) => {
  if (v === null || v === undefined || v === "") return dash;
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (n === 0) return <Text style={{ color: "#1677ff" }}>в срок</Text>;
  if (n < 0) {
    return <Text style={{ color: GREEN }}>{Math.abs(n)} дн. раньше</Text>;
  }
  return <Text style={{ color: "#cf1322" }}>{n} дн. позже</Text>;
};

const ApprovalsPage = () => {
  const navigate = useNavigate();
  const { role, branchId: userBranchId } = useAuthStore();
  const rawRole = (() => {
    if (role) return role;
    try {
      const direct = localStorage.getItem("role");
      if (direct) return direct;
      const session = JSON.parse(localStorage.getItem("session") || "null");
      return session?.role || "";
    } catch {
      return "";
    }
  })();
  const normalizedRole = String(rawRole || "").toLowerCase().trim();

  const roleHas = (list, parts) =>
    list.includes(normalizedRole) ||
    parts.some((p) => normalizedRole.includes(p));

  const isCompliance = roleHas(COMPLIANCE_ROLES, [
    "compl",
    "комплай",
    "комплаенс",
  ]);
  const isCurrencyControl =
    !isCompliance &&
    (roleHas(CURRENCY_CONTROL_ROLES, ["currency", "valut", "валют"]) ||
      ["vk", "вк"].includes(normalizedRole));
  const isAdmin =
    !isCompliance &&
    !isCurrencyControl &&
    roleHas(ADMIN_ROLES, ["admin", "админ"]);

  const canCompliance = isAdmin || isCompliance;
  const canCurrencyControl = isAdmin || isCurrencyControl;
  const canDecide = canCompliance || canCurrencyControl;
  const canReviewGtd = isAdmin || isCompliance || isCurrencyControl;
  const canViewPermissions = isAdmin || isCompliance;
  const canManagePermissions = isAdmin || isCompliance;

  const {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    detail,
    detailLoading,
    detailError,
    submitting,
    permissions,
    permissionsLoading,
    gtdLoading,
    fetchPending,
    fetchAccepted,
    acceptedItems: storeAcceptedItems,
    acceptedLoading,
    acceptedError,
    clearAcceptedError,
    myPermissions,
    myPermissionsLoading,
    myPermissionsError,
    fetchMyPermissions,
    fetchDetail,
    submitCompliance,
    submitCurrencyControl,
    fetchPermissions,
    grantPermission,
    revokePermission,
    fetchGtdPending,
    reviewGtd,
    setPage,
    clearError,
    clearDetail,
    searchUsers,
    userSearchResults,
    userSearchLoading,
    updatePermission,
  } = useApprovalsStore();

  const [activeTab, setActiveTab] = useState("pending");
  const [adminStageFilter, setStageFilter] = useState("");
  const stageFilter = isCompliance
    ? "compliance"
    : isCurrencyControl
      ? "currency_control"
      : adminStageFilter;
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGrantOpen, setIsGrantOpen] = useState(false);

  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  const [editingPermission, setEditingPermission] = useState(null);
  const [currentRecord, setCurrentRecord] = useState(null);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewingGtd, setReviewingGtd] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [gtdPage] = useState(1);
  const [gtdPageSize] = useState(20);

  const [decisionForm] = Form.useForm();
  const [grantForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  const debouncedSearch = useMemo(
    () =>
      debounce((query) => {
        if (query) searchUsers(query);
      }, 500),
    [searchUsers],
  );

  const ACCEPTED_DECISIONS = ["approve", "approved", "accepted"];
  const isFullyAccepted = (r) =>
    ["approved", "accepted"].includes(r.approval_status) ||
    (ACCEPTED_DECISIONS.includes(r.compliance_decision) &&
      ACCEPTED_DECISIONS.includes(r.currency_control_decision));

  const baseItems = (Array.isArray(items) ? items : []).filter(
    (r) =>
      ALLOWED_ENTITY_TYPES.includes(r.entity_type) &&
      (!entityTypeFilter || r.entity_type === entityTypeFilter),
  );

  const visibleItems = baseItems.filter(
    (r) => !isFullyAccepted(r) && matchesStage(r, stageFilter),
  );

  const acceptedItems = (() => {
    if (!isAdmin) return [];
    const map = new Map();
    [
      ...(Array.isArray(storeAcceptedItems) ? storeAcceptedItems : []),
      ...baseItems.filter(isFullyAccepted),
    ]
      .filter(
        (r) =>
          ALLOWED_ENTITY_TYPES.includes(r.entity_type) &&
          (!entityTypeFilter || r.entity_type === entityTypeFilter),
      )
      .forEach((r) => map.set(`${r.entity_type}-${r.entity_id ?? r.id}`, r));
    return [...map.values()];
  })();

  const itemsByType = (type) =>
    visibleItems.filter((r) => r.entity_type === type);

  const pendingCount = visibleItems.length;

  useEffect(() => {
    if (activeTab === "pending") {
      fetchPending({ stage: stageFilter, entity_type: entityTypeFilter }).catch(
        () => {},
      );
    }
    if (activeTab === "pending" && isAdmin) {
      fetchAccepted({ entity_type: entityTypeFilter });
    }
    if (activeTab === "permissions" && canViewPermissions) {
      fetchPermissions().catch(() => {});
    }
    if (activeTab === "gtd_extensions" && canReviewGtd) {
      fetchGtdPending(userBranchId, gtdPage, gtdPageSize).catch(() => {});
    }
    if (activeTab === "my_permissions" && canReviewGtd) {
      fetchMyPermissions().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stageFilter,
    entityTypeFilter,
    page,
    activeTab,
    gtdPage,
    gtdPageSize,
    userBranchId,
  ]);

  useEffect(() => {
    if (error) {
      message.error({
        content: cleanErrorText(error) || "Произошла ошибка",
        key: "approvals-error",
      });
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    if (acceptedError) {
      message.error({
        content:
          cleanErrorText(acceptedError) ||
          "Не удалось загрузить принятые документы",
        key: "approvals-accepted-error",
      });
      clearAcceptedError();
    }
  }, [acceptedError, clearAcceptedError]);

  const reloadPending = () => {
    if (isAdmin) fetchAccepted({ entity_type: entityTypeFilter });
    return fetchPending({
      stage: stageFilter,
      entity_type: entityTypeFilter,
    }).catch(() => {});
  };

  const handleOpenDetail = async (record) => {
    setCurrentRecord(record);
    setIsDetailOpen(true);
    try {
      await fetchDetail(record.entity_type, record.entity_id || record.id);
    } catch {
      // ошибка в сторе
    }
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setCurrentRecord(null);
    clearDetail();
  };

  const currentApprovalStatus =
    detail?.approval_status || currentRecord?.approval_status;

  const resolveDecisionType = () => {
    if (currentApprovalStatus === "pending_compliance") return "compliance";
    if (currentApprovalStatus === "pending_currency_control") {
      return "currency_control";
    }
    if (isCompliance) return "compliance";
    return "currency_control";
  };

  const canDecideNow =
    (canCompliance && currentApprovalStatus === "pending_compliance") ||
    (canCurrencyControl && currentApprovalStatus === "pending_currency_control");

  const submitDecision = async (action, comment) => {
    if (decisionSubmitting) return;

    const entityType = detail?.entity_type || currentRecord?.entity_type;
    const entityId =
      detail?.entity_id ||
      currentRecord?.entity_id ||
      currentRecord?.id ||
      detail?.id;

    if (!entityType || !entityId) {
      message.error("Не удалось определить документ");
      return false;
    }

    const type = resolveDecisionType();
    const payload = {
      decision: API_DECISION[type][action],
      comment: DECISION_ACTIONS[action].needsComment ? comment || "" : "",
    };

    setDecisionSubmitting(true);
    try {
      if (type === "compliance") {
        await submitCompliance(entityType, entityId, payload);
      } else {
        await submitCurrencyControl(entityType, entityId, payload);
      }

      message.success({
        content: `${DECISION_STAGE_LABEL[type]}: ${DECISION_SUCCESS_TEXT[action]}`,
        key: "approvals-decision",
      });

      setIsCommentOpen(false);
      setPendingAction(null);
      setIsDetailOpen(false);
      setCurrentRecord(null);
      clearDetail();
      await reloadPending();
      return true;
    } catch (e) {
      message.error({
        content: errorText(e, "Не удалось сохранить решение"),
        key: "approvals-decision",
      });
      return false;
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handleDecisionClick = (action) => {
    if (!DECISION_ACTIONS[action].needsComment) {
      submitDecision(action, "");
      return;
    }
    setPendingAction(action);
    decisionForm.resetFields();
    setIsCommentOpen(true);
  };

  const handleCommentSubmit = async () => {
    if (!pendingAction || decisionSubmitting) return;
    let values;
    try {
      values = await decisionForm.validateFields();
    } catch {
      return;
    }
    await submitDecision(pendingAction, values.comment?.trim());
  };

  const closeCommentModal = () => {
    if (decisionSubmitting) return;
    setIsCommentOpen(false);
    setPendingAction(null);
  };

  const handleOpenGrant = () => {
    setEditingPermission(null);
    grantForm.resetFields();
    setIsGrantOpen(true);
  };

  const handleOpenEdit = (record) => {
    setEditingPermission(record);
    grantForm.setFieldsValue({
      login: record.login,
      can_create: record.can_create ? "yes" : "no",
      can_edit: record.can_edit ? "yes" : "no",
      can_delete: record.can_delete ? "yes" : "no",
    });
    setIsGrantOpen(true);
  };

  const handleSavePermission = async () => {
    let values;
    try {
      values = await grantForm.validateFields();
    } catch {
      return;
    }

    const payload = {
      login: values.login,
      can_create: values.can_create === "yes",
      can_edit: values.can_edit === "yes",
      can_delete: values.can_delete === "yes",
    };

    try {
      if (editingPermission) {
        await updatePermission(editingPermission.login, payload);
        message.success("Права обновлены");
      } else {
        await grantPermission(payload);
        message.success("Доступ выдан");
      }
      setIsGrantOpen(false);
      grantForm.resetFields();
      setEditingPermission(null);
      await fetchPermissions().catch(() => {});
    } catch (e) {
      message.error(errorText(e, "Не удалось сохранить права"));
    }
  };

  const handleRevokePermission = async (login) => {
    try {
      await revokePermission(login);
      message.success("Доступ отозван");
      await fetchPermissions().catch(() => {});
    } catch (e) {
      message.error(errorText(e, "Не удалось отозвать доступ"));
    }
  };

  const closeReviewModal = () => {
    setIsReviewOpen(false);
    setReviewingGtd(null);
    reviewForm.resetFields();
  };

  const handleReviewSubmit = async () => {
    if (!reviewingGtd || reviewSubmitting) return;
    let values;
    try {
      values = await reviewForm.validateFields();
    } catch {
      return;
    }

    const payload = {
      decision: values.decision,
      comment: values.comment || "",
      approved_deadline:
        values.decision === "approve" && values.approved_deadline
          ? values.approved_deadline.format("YYYY-MM-DD")
          : null,
    };

    setReviewSubmitting(true);
    try {
      await reviewGtd(reviewingGtd.id, payload);
      message.success(
        values.decision === "approve" ? "Заявка одобрена" : "Заявка отклонена",
      );
      closeReviewModal();
      await fetchGtdPending(userBranchId, gtdPage, gtdPageSize);
    } catch (e) {
      message.error(errorText(e, "Не удалось рассмотреть заявку"));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const dateCell = (v) => (
    <Space size={4}>
      <CalendarOutlined style={{ color: RED, fontSize: 12 }} />
      <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
    </Space>
  );

  const textCell = (v, Icon) =>
    v ? (
      <Tooltip title={v} placement="topLeft">
        <Space size={6}>
          {Icon && <Icon style={{ color: RED, fontSize: 12 }} />}
          <Text style={{ fontSize: 13 }}>{v}</Text>
        </Space>
      </Tooltip>
    ) : (
      dash
    );

  const amountCell = (v, currency) => (
    <Text strong style={{ color: "#d946ef", fontSize: 13 }}>
      {formatMoney(v, currency)}
    </Text>
  );

  const decisionLine = (label, decision, comment) => {
    const info = decision
      ? getDecisionInfo(decision)
      : { label: "Ожидает", color: "default" };
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Text type="secondary" style={{ fontSize: 12, minWidth: 100 }}>
          {label}:
        </Text>
        <Tooltip title={comment || null}>
          <Tag
            color={info.color}
            style={{
              borderRadius: 8,
              margin: 0,
              fontSize: 12,
              fontWeight: 600,
              padding: "2px 12px",
            }}
          >
            {info.label}
          </Tag>
        </Tooltip>
      </div>
    );
  };

  const approvalColumn = (title) => ({
    title,
    key: "approval",
    width: 260,
    render: (_, r) => {
      const info = getStatusInfo(r.approval_status);
      return (
        <Space orientation="vertical" size={6}>
          <Tag
            color={info.color}
            style={{ borderRadius: 8, fontWeight: 500, padding: "2px 10px" }}
          >
            {info.label}
          </Tag>
          {decisionLine(
            "Комплаенс",
            r.compliance_decision,
            r.compliance_comment,
          )}
          {decisionLine(
            "Вал. контроль",
            r.currency_control_decision,
            r.currency_control_comment,
          )}
        </Space>
      );
    },
  });

  const actionCol = {
    title: "Действие",
    key: "actions",
    width: 90,
    align: "center",
    render: (_, record) => (
      <Tooltip title="Открыть">
        <Button
          type="text"
          icon={<EyeOutlined style={{ color: RED }} />}
          onClick={() => handleOpenDetail(record)}
        />
      </Tooltip>
    ),
  };

  // ----- Платёжные поручения -----
  const poColumns = [
    actionCol,
    {
      title: "Дата валютирования",
      dataIndex: "value_date",
      key: "value_date",
      width: 150,
      render: (v) => dateCell(v),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      width: 130,
      render: (v, r) => amountCell(v, r.currency),
    },
    {
      title: "Отправитель",
      dataIndex: "sender_name",
      key: "sender_name",
      width: 160,
      render: (v) => textCell(v, SendOutlined),
    },
    {
      title: "Получатель",
      dataIndex: "receiver_name",
      key: "receiver_name",
      width: 150,
      render: (v) => textCell(v, UserOutlined),
    },
    {
      title: "Банк получателя",
      dataIndex: "receiver_bank",
      key: "receiver_bank",
      width: 160,
      render: (v) => textCell(v, BankOutlined),
    },
    {
      title: "Страна получателя",
      dataIndex: "receiver_country",
      key: "receiver_country",
      width: 160,
      render: (v) => textCell(v, GlobalOutlined),
    },
    {
      title: "Назначение платежа",
      dataIndex: "payment_purpose",
      key: "payment_purpose",
      width: 180,
      render: (v) => textCell(v),
    },
    approvalColumn("Согласование ПП"),
  ];

  // ----- ГТД -----
  const gtdColumns = [
    actionCol,
    {
      title: "Номер ГТД",
      dataIndex: "document_number",
      key: "document_number",
      width: 150,
      render: (v) => (
        <Text strong style={{ fontSize: 13 }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Дата",
      dataIndex: "document_date",
      key: "document_date",
      width: 150,
      render: (v) => dateCell(v),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (v, r) => amountCell(v, r.currency),
    },
    {
      title: "Документ",
      dataIndex: "document_path",
      key: "document_path",
      width: 220,
      render: (v, r) =>
        v ? (
          <DocumentLink entityType="gtd" entityId={r.entity_id} filePath={v} />
        ) : (
          dash
        ),
    },
    approvalColumn("Согласование ГТД"),
  ];

  // ----- Контракты -----
  const contractColumns = [
    actionCol,
    {
      title: "Номер контракта",
      dataIndex: "document_number",
      key: "document_number",
      width: 180,
      render: (v) => (
        <Text strong style={{ fontSize: 13 }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Дата",
      dataIndex: "document_date",
      key: "document_date",
      width: 150,
      render: (v) => dateCell(v),
    },
    {
      title: "Предмет",
      dataIndex: "subject",
      key: "subject",
      width: 200,
      render: (v) => textCell(v, FileTextOutlined),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (v, r) => amountCell(v, r.currency),
    },
    {
      title: "Документ",
      dataIndex: "document_path",
      key: "document_path",
      width: 220,
      render: (v, r) =>
        v ? (
          <DocumentLink
            entityType="contract"
            entityId={r.entity_id}
            filePath={v}
          />
        ) : (
          dash
        ),
    },
    approvalColumn("Согласование Контракта"),
  ];

  // ----- Доп. соглашения -----
  const agreementColumns = [
    actionCol,
    {
      title: "Номер",
      dataIndex: "document_number",
      key: "document_number",
      width: 180,
      render: (v) => (
        <Text strong style={{ fontSize: 13 }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Дата",
      dataIndex: "document_date",
      key: "document_date",
      width: 150,
      render: (v) => dateCell(v),
    },
    {
      title: "Предмет",
      dataIndex: "subject",
      key: "subject",
      width: 200,
      render: (v) => textCell(v, FileTextOutlined),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (v, r) => amountCell(v, r.currency),
    },
    {
      title: "Документ",
      dataIndex: "document_path",
      key: "document_path",
      width: 220,
      render: (v, r) =>
        v ? (
          <DocumentLink
            entityType="additional_agreement"
            entityId={r.entity_id}
            filePath={v}
          />
        ) : (
          dash
        ),
    },
    approvalColumn("Согласование Доп. соглашения"),
  ];

  // ----- Принятые документы (все типы) -----
  const acceptedColumns = [
    actionCol,
    {
      title: "Номер",
      dataIndex: "document_number",
      key: "document_number",
      width: 140,
      render: (v) => (
        <Text strong style={{ fontSize: 13 }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Тип",
      dataIndex: "entity_type",
      key: "entity_type",
      width: 170,
      render: (v) => (
        <Tag color={ENTITY_TYPE_MAP[v]?.color || "default"}>
          {ENTITY_TYPE_MAP[v]?.label || humanize(v)}
        </Tag>
      ),
    },
    {
      title: "Дата",
      dataIndex: "document_date",
      key: "document_date",
      width: 140,
      render: (v, r) => dateCell(v || r.value_date),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (v, r) => amountCell(v, r.currency),
    },
    approvalColumn("Согласование"),
  ];

  // Описание всех секций (порядок = порядок на странице)
  const SECTIONS = [
    {
      type: "contract",
      title: "Контракты",
      icon: FileProtectOutlined,
      columns: contractColumns,
      emptyText: "Нет контрактов на согласовании",
    },
    {
      type: "additional_agreement",
      title: "Доп. соглашения",
      icon: FileAddOutlined,
      columns: agreementColumns,
      emptyText: "Нет доп. соглашений на согласовании",
    },
    {
      type: "payment_order",
      title: "Платёжные поручения",
      icon: CreditCardOutlined,
      columns: poColumns,
      emptyText: "Нет платёжных поручений на согласовании",
    },
    {
      type: "gtd",
      title: "ГТД",
      icon: GlobalOutlined,
      columns: gtdColumns,
      emptyText: "Нет ГТД на согласовании",
    },
  ];

  const renderPendingSection = ({
    title,
    icon,
    columns,
    data,
    emptyText,
    tableLoading = loading,
  }) => (
    <Card
      key={title}
      style={{
        marginBottom: 20,
        borderRadius: 18,
        border: "none",
        boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
      styles={{ body: { padding: 0 } }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background:
            "linear-gradient(90deg, #fff5f5 0%, #ffffff 60%, #fff5f5 100%)",
          borderBottom: "1px solid rgba(139,0,0,0.06)",
        }}
      >
        <Space size={10}>
          {icon}
          <Text strong style={{ fontSize: 15, color: RED }}>
            {title}
          </Text>
        </Space>
        <Tag
          color="red"
          style={{
            borderRadius: 8,
            padding: "2px 12px",
            fontWeight: 600,
            fontSize: 13,
            color: RED,
          }}
        >
          Всего: {data.length}
        </Tag>
      </div>
      <div style={{ padding: 20 }}>
        <Table
          className="red-table"
          rowKey={(r) => `${r.entity_type}-${r.entity_id ?? r.id}`}
          loading={tableLoading}
          columns={columns}
          dataSource={data}
          scroll={{ x: "max-content" }}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ color: "#999" }}>{emptyText}</span>}
              />
            ),
          }}
        />
      </div>
    </Card>
  );

  const permissionsColumns = [
    {
      title: "Логин",
      dataIndex: "login",
      key: "login",
      width: 200,
      render: (v) => (
        <Text strong style={{ fontFamily: "monospace" }}>
          @{v}
        </Text>
      ),
    },
    {
      title: "Пользователь",
      key: "user",
      width: 220,
      render: (_, record) => {
        const user = record.user || {};
        const fullName = [user.first_name, user.last_name]
          .filter(Boolean)
          .join(" ");
        return <Text>{fullName || "—"}</Text>;
      },
    },
    {
      title: "Создание",
      dataIndex: "can_create",
      key: "can_create",
      width: 120,
      render: (v) =>
        v ? <Tag color="green">Да</Tag> : <Tag color="default">Нет</Tag>,
    },
    {
      title: "Редактирование",
      dataIndex: "can_edit",
      key: "can_edit",
      width: 150,
      render: (v) =>
        v ? <Tag color="green">Да</Tag> : <Tag color="default">Нет</Tag>,
    },
    {
      title: "Удаление",
      dataIndex: "can_delete",
      key: "can_delete",
      width: 120,
      render: (v) =>
        v ? <Tag color="green">Да</Tag> : <Tag color="default">Нет</Tag>,
    },
    {
      title: "Выдал",
      key: "granter",
      width: 220,
      render: (_, record) => {
        const g = record.granter || {};
        return (
          <Text style={{ fontSize: 13 }}>
            {getPersonName(g) || g.login || record.granted_by || "—"}
          </Text>
        );
      },
    },
    {
      title: "Дата",
      dataIndex: "granted_at",
      key: "granted_at",
      width: 170,
      render: (v) => <Text type="secondary">{formatDateTime(v)}</Text>,
    },
    ...(canManagePermissions
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 120,
            align: "right",
            render: (_, record) => (
              <Space size={0}>
                <Tooltip title="Редактировать">
                  <Button
                    type="text"
                    icon={<EditOutlined style={{ color: RED }} />}
                    onClick={() => handleOpenEdit(record)}
                  />
                </Tooltip>
                <Tooltip title="Отозвать">
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRevokePermission(record.login)}
                  />
                </Tooltip>
              </Space>
            ),
          },
        ]
      : []),
  ];

  const tabItems = [
    {
      key: "pending",
      label: (
        <Space size={6}>
          <AuditOutlined style={{ color: RED }} />
          <span style={{ color: RED, fontWeight: 600 }}>На согласовании</span>
          {pendingCount > 0 && (
            <Badge
              count={pendingCount}
              style={{ backgroundColor: RED, boxShadow: "none" }}
            />
          )}
        </Space>
      ),
      children: (
        <>
          <Card
            style={{
              marginBottom: 20,
              borderRadius: 18,
              border: "none",
              boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
            }}
            styles={{ body: { padding: 20 } }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Text
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 14,
                    color: RED,
                    fontWeight: 600,
                  }}
                >
                  Этап согласования:
                </Text>
                <Select
                  value={stageFilter}
                  onChange={(v) => {
                    setStageFilter(v ?? "");
                    setPage(1);
                  }}
                  style={{
                    width: "100%",
                    height: 35,
                    border: `1px solid ${RED}`,
                  }}
                  allowClear={isAdmin}
                  disabled={!isAdmin}
                  placeholder="Все этапы"
                  options={
                    isAdmin
                      ? [
                          { value: "", label: "Все этапы" },
                          { value: "currency_control", label: "Валютный контроль" },
                          { value: "compliance", label: "Комплаенс" },
                          { value: "revision", label: "На доработке" },
                        ]
                      : [
                          {
                            value: stageFilter,
                            label: DECISION_STAGE_LABEL[stageFilter],
                          },
                        ]
                  }
                />
              </Col>

              <Col xs={24} md={12}>
                <Text
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 14,
                    color: RED,
                    fontWeight: 600,
                  }}
                >
                  Тип документа:
                </Text>
                <Select
                  value={entityTypeFilter}
                  onChange={(v) => {
                    setEntityTypeFilter(v || "");
                    setPage(1);
                  }}
                  style={{
                    width: "100%",
                    height: 35,
                    border: `1px solid ${RED}`,
                  }}
                  allowClear
                  placeholder="Все документы"
                  options={ENTITY_TYPE_FILTER_OPTIONS}
                />
              </Col>
            </Row>
          </Card>

          {loading && visibleItems.length === 0 ? (
            <div
              style={{
                minHeight: 300,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Spin size="small" style={{ color: "#f00" }} />
            </div>
          ) : (
            <>
              {SECTIONS.filter(
                (s) => !entityTypeFilter || entityTypeFilter === s.type,
              ).map((s) => {
                const Icon = s.icon;
                return renderPendingSection({
                  title: s.title,
                  icon: <Icon style={{ color: RED, fontSize: 16 }} />,
                  columns: s.columns,
                  data: itemsByType(s.type),
                  emptyText: s.emptyText,
                });
              })}
              {isAdmin &&
                renderPendingSection({
                  title: "Принятые документы",
                  icon: (
                    <CheckOutlined style={{ color: GREEN, fontSize: 16 }} />
                  ),
                  columns: acceptedColumns,
                  data: acceptedItems,
                  tableLoading: acceptedLoading,
                  emptyText:
                    "Нет документов, принятых комплаенсом и валютным контролем",
                })}
              {total > pageSize && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={total}
                    showSizeChanger={false}
                    onChange={(p) => setPage(p)}
                  />
                </div>
              )}
            </>
          )}
        </>
      ),
    },
  ];

  if (canViewPermissions) {
    tabItems.push({
      key: "permissions",
      label: (
        <Space size={6}>
          <KeyOutlined style={{ color: RED }} />
          <span style={{ color: RED, fontWeight: 600 }}>Права доступа</span>
        </Space>
      ),
      children: (
        <Card
          style={{
            borderRadius: 18,
            border: "none",
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
          styles={{ body: { padding: 0 } }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background:
                "linear-gradient(90deg, #fff5f5 0%, #ffffff 60%, #fff5f5 100%)",
              borderBottom: "1px solid rgba(139,0,0,0.06)",
            }}
          >
            <Space size={10}>
              <KeyOutlined style={{ color: RED, fontSize: 16 }} />
              <Text strong style={{ fontSize: 15, color: RED }}>
                Права доступа ВК
              </Text>
            </Space>
            <Space>
              <Tag color="red" style={{ borderRadius: 8 }}>
                Всего: {permissions.length}
              </Tag>
              {canManagePermissions && (
                <Button
                  danger
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleOpenGrant}
                  style={{
                    borderRadius: 10,
                    height: 36,
                    background: RED,
                    border: "none",
                  }}
                >
                  Выдать доступ
                </Button>
              )}
            </Space>
          </div>

          <div style={{ padding: 20 }}>
            {permissionsLoading && permissions.length === 0 ? (
              <div
                style={{
                  minHeight: 300,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Spin size="small" style={{ color: "#f00" }} />
              </div>
            ) : (
              <Table
                className="red-table"
                rowKey={(r) => String(r.login || r.id)}
                loading={permissionsLoading}
                columns={permissionsColumns}
                dataSource={permissions}
                scroll={{ x: "max-content" }}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false,
                }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span style={{ color: "#999" }}>
                          Нет выданных разрешений
                        </span>
                      }
                    />
                  ),
                }}
              />
            )}
          </div>
        </Card>
      ),
    });
  }

  if (canReviewGtd) {
    const hasFullAccess = isAdmin || isCompliance;
    const MY_RIGHTS = [
      { key: "can_create", label: "Создание документов" },
      { key: "can_edit", label: "Редактирование документов" },
      { key: "can_delete", label: "Удаление документов" },
    ];

    const renderRight = (key) => {
      const allowed = hasFullAccess || !!myPermissions?.[key];
      return allowed ? (
        <Tag
          color="green"
          icon={<CheckCircleOutlined />}
          style={{ borderRadius: 8, margin: 0, fontWeight: 600 }}
        >
          Да
        </Tag>
      ) : (
        <Tag
          icon={<CloseCircleOutlined />}
          style={{ borderRadius: 8, margin: 0, fontWeight: 600 }}
        >
          Нет
        </Tag>
      );
    };

    tabItems.push({
      key: "my_permissions",
      label: (
        <Space size={6}>
          <SafetyCertificateOutlined style={{ color: RED }} />
          <span style={{ color: RED, fontWeight: 600 }}>Мои права</span>
        </Space>
      ),
      children: (
        <Card
          style={{
            borderRadius: 18,
            border: "none",
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
          styles={{ body: { padding: 0 } }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background:
                "linear-gradient(90deg, #fff5f5 0%, #ffffff 60%, #fff5f5 100%)",
              borderBottom: "1px solid rgba(139,0,0,0.06)",
            }}
          >
            <Space size={10}>
              <SafetyCertificateOutlined style={{ color: RED, fontSize: 16 }} />
              <Text strong style={{ fontSize: 15, color: RED }}>
                Мои права валютного контроля
              </Text>
            </Space>
          </div>

          <div style={{ padding: 20 }}>
            {myPermissionsLoading && !myPermissions ? (
              <div
                style={{
                  minHeight: 200,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Spin size="small" style={{ color: "#f00" }} />
              </div>
            ) : (
              <>
                {myPermissionsError && (
                  <Alert
                    type="error"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: 10 }}
                    message={
                      cleanErrorText(myPermissionsError) ||
                      "Не удалось загрузить права"
                    }
                  />
                )}

                {hasFullAccess && (
                  <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: 10 }}
                    message="Администратор и Комплаенс имеют полный доступ независимо от выданных прав"
                  />
                )}

                {!hasFullAccess &&
                  myPermissions &&
                  !myPermissions.can_create &&
                  !myPermissions.can_edit &&
                  !myPermissions.can_delete && (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16, borderRadius: 10 }}
                      message="Вам пока не выдано ни одного права. Обратитесь к Комплаенсу или Администратору."
                    />
                  )}

                <Descriptions
                  bordered
                  column={1}
                  size="middle"
                  styles={{
                    label: {
                      background: "#fafafa",
                      fontWeight: 600,
                      width: 260,
                    },
                  }}
                >
                  <Descriptions.Item label="Логин">
                    <Text strong style={{ fontFamily: "monospace" }}>
                      {myPermissions?.login ? `@${myPermissions.login}` : "—"}
                    </Text>
                  </Descriptions.Item>
                  {MY_RIGHTS.map((r) => (
                    <Descriptions.Item key={r.key} label={r.label}>
                      {renderRight(r.key)}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </>
            )}
          </div>
        </Card>
      ),
    });
  }

  const decisionButtons =
    canDecide && canDecideNow && !detailLoading && !detailError && detail
      ? ["approve", "revision", "reject"]
          .filter(
            (a) =>
              !(
                a === "revision" &&
                resolveDecisionType() === "compliance" &&
                !COMPLIANCE_REVISION_ENABLED
              ),
          )
          .map((action) => {
            const cfg = DECISION_ACTIONS[action];
            return (
              <Button
                key={action}
                type="primary"
                icon={cfg.icon}
                loading={decisionSubmitting && !isCommentOpen}
                disabled={decisionSubmitting}
                onClick={() => handleDecisionClick(action)}
                style={{
                  borderRadius: 10,
                  background: cfg.color,
                  borderColor: cfg.color,
                  fontWeight: 600,
                }}
              >
                {cfg.label}
              </Button>
            );
          })
      : [];

  const descStyles = {
    label: {
      background: "#fafafa",
      fontWeight: 600,
      fontSize: 12,
      width: 180,
    },
    content: { fontSize: 13 },
  };

  const renderStageBlock = ({
    title,
    icon,
    color,
    isCurrent,
    decision,
    comment,
    reviewer,
    reviewedAt,
  }) => (
    <div
      style={{
        marginTop: 16,
        borderRadius: 12,
        border: `1px solid ${color}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: `${color}12`,
          borderBottom: `1px solid ${color}33`,
        }}
      >
        <Space size={8}>
          <span style={{ color, fontSize: 16, display: "flex" }}>{icon}</span>
          <Text strong style={{ color, fontSize: 14 }}>
            {title}
          </Text>
        </Space>
        {isCurrent && (
          <Tag
            color={color}
            style={{ borderRadius: 8, margin: 0, fontWeight: 600 }}
          >
            Сейчас на этом этапе
          </Tag>
        )}
      </div>
      <Descriptions
        column={1}
        size="small"
        bordered
        styles={descStyles}
        style={{ borderRadius: 0 }}
      >
        <Descriptions.Item label="Решение">
          {decision ? (
            renderDecision(decision)
          ) : (
            <Tag style={{ borderRadius: 6, margin: 0 }}>Ожидает</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Комментарий">
          {comment || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Проверил">
          {getPersonName(reviewer) || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Дата">
          {reviewedAt ? formatDateTime(reviewedAt) : "—"}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: "1px solid rgba(139,0,0,0.08)",
        }}
      >
        <Space size={16} align="center">
          <div
            style={{
              width: 45,
              height: 45,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: RED,
              boxShadow: "0 10px 24px rgba(139,0,0,0.28)",
              flexShrink: 0,
            }}
          >
            <AuditOutlined style={{ fontSize: 18, color: "#fff" }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: RED }}>
              Согласования
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Документы на согласовании, права доступа и продление ГТД
            </Text>
          </div>
        </Space>

        <Space>
          <Button
            danger
            icon={<ReloadOutlined />}
            onClick={() => {
              if (activeTab === "pending") {
                reloadPending();
              } else if (activeTab === "permissions") {
                fetchPermissions().catch(() => {});
              } else if (activeTab === "my_permissions") {
                fetchMyPermissions().catch(() => {});
              } else if (activeTab === "gtd_extensions") {
                fetchGtdPending(userBranchId, gtdPage, gtdPageSize).catch(
                  () => {},
                );
              }
            }}
            loading={
              loading ||
              permissionsLoading ||
              gtdLoading ||
              acceptedLoading ||
              myPermissionsLoading
            }
            style={{
              borderRadius: 12,
              height: 35,
              background: RED,
              color: "#fff",
              border: `1px solid ${RED}`,
              fontWeight: 600,
            }}
          >
            Обновить
          </Button>

          <Button
            danger
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ borderRadius: 12, height: 35 }}
          >
            Назад
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k)}
        items={tabItems}
        size="large"
        tabBarStyle={{
          "--ant-color-primary": RED,
          "--ant-color-primary-border": RED,
          "--ant-tabs-ink-bar-color": RED,
        }}
      />

      {/* ===== МОДАЛКА: ДЕТАЛИ ДОКУМЕНТА ===== */}
      <Modal
        title={
          <Space size={10}>
            <FileTextOutlined style={{ color: RED, fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: RED }}>
              Детали документа
            </span>
          </Space>
        }
        open={isDetailOpen}
        onCancel={() => {
          if (!decisionSubmitting) handleCloseDetail();
        }}
        footer={[
          ...decisionButtons,
          <Button
            key="close"
            danger
            disabled={decisionSubmitting}
            onClick={handleCloseDetail}
          >
            Закрыть
          </Button>,
        ]}
        width={900}
        style={{ top: 40 }}
        destroyOnHidden
      >
        {detailLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin size="small" style={{ color: "#f00" }} />
          </div>
        ) : detailError ? (
          <Empty
            description={
              <span style={{ color: "#cf1322" }}>
                {cleanErrorText(detailError)}
              </span>
            }
          />
        ) : !detail ? (
          <Empty description="Нет данных" />
        ) : (
          <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
            <Descriptions
              bordered
              column={2}
              size="small"
              styles={descStyles}
            >
              <Descriptions.Item label="Тип">
                <Tag
                  color={
                    ENTITY_TYPE_MAP[detail.entity_type]?.color || "default"
                  }
                >
                  {ENTITY_TYPE_MAP[detail.entity_type]?.label ||
                    humanize(detail.entity_type)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="ID">
                {detail.entity_id || detail.id}
              </Descriptions.Item>
              <Descriptions.Item label="Номер">
                {detail.document_number || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Дата документа">
                {formatDateShort(detail.document_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Предмет" span={2}>
                {detail.subject || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Контрагент">
                {detail.counterparty_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Филиал">
                {detail.branch_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Сумма">
                <DollarOutlined style={{ color: RED, marginRight: 6 }} />
                {formatMoney(detail.amount, detail.currency)}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag color={getStatusInfo(detail.approval_status).color}>
                  {getStatusInfo(detail.approval_status).label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Создал" span={2}>
                {getPersonName(detail.creator) || "—"}
                {detail.creator?.login ? ` (@${detail.creator.login})` : ""}
                {detail.creator?.email ? ` • ${detail.creator.email}` : ""}
              </Descriptions.Item>
              <Descriptions.Item label="Создан" span={2}>
                {formatDateTime(detail.created_at)}
              </Descriptions.Item>
            </Descriptions>

            {(detail.contract_number || detail.invoice_number) && (
              <>
                <Divider style={{ margin: "16px 0" }}>
                  Контракт и инвойс
                </Divider>
                <Descriptions
                  bordered
                  column={2}
                  size="small"
                  styles={descStyles}
                >
                  <Descriptions.Item label="Контракт">
                    {detail.contract_number || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="ID контракта">
                    {detail.contract_id ?? "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Инвойс">
                    {detail.invoice_number || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="ID инвойса">
                    {detail.invoice_id ?? "—"}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {detail.entity_type === "gtd" && (
              <>
                <Divider style={{ margin: "16px 0" }}>Данные ГТД</Divider>
                {detail.delivery_notice && (
                  <Alert
                    style={{
                      marginBottom: 12,
                      border: "1px solid #8b0000",
                      background: "#fff",
                    }}
                    showIcon
                    type={
                      Number(detail.days_difference) > 0 ? "warning" : "info"
                    }
                    message={detail.delivery_notice}
                  />
                )}
                <Descriptions
                  bordered
                  column={2}
                  size="small"
                  styles={descStyles}
                >
                  <Descriptions.Item label="Сумма закрытия">
                    {formatMoney(detail.closes_amount, detail.currency)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Дата подачи ГТД">
                    {formatDateShort(detail.submission_date)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Крайний срок поставки">
                    {formatDateShort(detail.delivery_deadline)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Разница дней">
                    {renderDaysDifference(detail.days_difference)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Статус поставки" span={2}>
                    {renderDeliveryStatus(detail.delivery_status)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Примечание" span={2}>
                    {detail.delivery_notice || "—"}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {detail.entity_type === "payment_order" && (
              <>
                <Divider style={{ margin: "16px 0" }}>
                  Данные платёжного поручения
                </Divider>
                <Descriptions
                  bordered
                  column={2}
                  size="small"
                  styles={descStyles}
                >
                  <Descriptions.Item label="Дата валютирования" span={2}>
                    {formatDateShort(detail.value_date)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Отправитель">
                    {detail.sender_name || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Получатель">
                    {detail.receiver_name || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Банк получателя">
                    {detail.receiver_bank || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Страна получателя">
                    {detail.receiver_country || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Назначение платежа" span={2}>
                    {detail.payment_purpose || "—"}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            <Divider style={{ margin: "20px 0 0" }}>Согласование</Divider>

            {renderStageBlock({
              title: "Комплаенс",
              icon: <SafetyCertificateOutlined />,
              color: PURPLE,
              isCurrent: detail.approval_status === "pending_compliance",
              decision: detail.compliance_decision,
              comment: detail.compliance_comment,
              reviewer: detail.compliance_reviewer,
              reviewedAt: detail.compliance_reviewed_at,
            })}

            {renderStageBlock({
              title: "Валютный контроль",
              icon: <DollarOutlined />,
              color: BLUE,
              isCurrent: detail.approval_status === "pending_currency_control",
              decision: detail.currency_control_decision,
              comment: detail.currency_control_comment,
              reviewer: detail.currency_control_reviewer,
              reviewedAt: detail.currency_control_reviewed_at,
            })}
          </div>
        )}
      </Modal>

      {/* ===== МОДАЛКА: КОММЕНТАРИЙ ===== */}
      <Modal
        title={
          <Space size={10}>
            <ExclamationCircleOutlined
              style={{
                color: pendingAction
                  ? DECISION_ACTIONS[pendingAction].color
                  : RED,
                fontSize: 18,
              }}
            />
            <span style={{ fontWeight: 700, color: RED }}>
              {pendingAction === "revision"
                ? "Отправить на доработку"
                : "Отказ"}
            </span>
          </Space>
        }
        open={isCommentOpen}
        onCancel={closeCommentModal}
        afterClose={() => decisionForm.resetFields()}
        mask={{ closable: false }}
        footer={[
          <Button
            key="submit"
            type="primary"
            icon={pendingAction ? DECISION_ACTIONS[pendingAction].icon : null}
            loading={decisionSubmitting || submitting}
            onClick={handleCommentSubmit}
            style={{
              background: pendingAction
                ? DECISION_ACTIONS[pendingAction].color
                : RED,
              borderColor: pendingAction
                ? DECISION_ACTIONS[pendingAction].color
                : RED,
            }}
          >
            {pendingAction === "revision" ? "На доработку" : "Отказать"}
          </Button>,
          <Button
            key="cancel"
            danger
            disabled={decisionSubmitting}
            onClick={closeCommentModal}
          >
            Отмена
          </Button>,
        ]}
        width={560}
        destroyOnHidden
      >
        <Form
          form={decisionForm}
          layout="vertical"
          autoComplete="off"
          preserve={false}
        >
          <Form.Item
            label="Комментарий"
            name="comment"
            rules={[
              { required: true, message: "Комментарий обязателен" },
              {
                validator: (_, value) =>
                  value && !String(value).trim()
                    ? Promise.reject(new Error("Комментарий обязателен"))
                    : Promise.resolve(),
              },
            ]}
          >
            <TextArea
              rows={4}
              autoFocus
              placeholder={
                pendingAction === "revision"
                  ? "Что нужно доработать?"
                  : "Укажите причину отказа"
              }
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== МОДАЛКА: ВЫДАТЬ/РЕДАКТИРОВАТЬ ДОСТУП ВК ===== */}
      <Modal
        title={
          <Space size={10}>
            <KeyOutlined style={{ color: RED, fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: RED }}>
              {editingPermission
                ? "Редактировать права доступа"
                : "Выдать доступ валютному контролю"}
            </span>
          </Space>
        }
        open={isGrantOpen}
        onCancel={() => {
          setIsGrantOpen(false);
          setEditingPermission(null);
        }}
        footer={[
          <Button
            key="submit"
            type="primary"
            danger
            icon={<CheckOutlined />}
            loading={submitting}
            onClick={handleSavePermission}
            style={{ background: RED }}
          >
            {editingPermission ? "Сохранить" : "Выдать"}
          </Button>,
          <Button
            key="cancel"
            danger
            onClick={() => {
              setIsGrantOpen(false);
              setEditingPermission(null);
            }}
          >
            Отмена
          </Button>,
        ]}
        width={520}
        destroyOnHidden
      >
        <Form
          form={grantForm}
          layout="vertical"
          autoComplete="off"
          initialValues={{ can_create: "no", can_edit: "no", can_delete: "no" }}
        >
          <Form.Item
            label="Логин сотрудника"
            name="login"
            rules={[{ required: true, message: "Выберите или введите логин" }]}
            tooltip="Начните вводить логин для поиска"
          >
            {editingPermission ? (
              <Input disabled style={{ borderRadius: 10 }} />
            ) : (
              <Select
                showSearch
                placeholder="Поиск по логину"
                defaultActiveFirstOption={false}
                suffixIcon={null}
                filterOption={false}
                onSearch={debouncedSearch}
                notFoundContent={
                  userSearchLoading ? <Spin size="small" style={{ color: "#f00" }} /> : null
                }
                options={(userSearchResults || []).map((u) => ({
                  value: u.login,
                  label: (
                    <Space>
                      <Text strong>{u.login}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {[u.last_name, u.first_name].filter(Boolean).join(" ")}
                      </Text>
                    </Space>
                  ),
                }))}
                style={{ width: "100%" }}
              />
            )}
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Создание" name="can_create">
                <Select
                  options={YES_NO_OPTIONS}
                  style={{
                    width: "100%",
                    border: `1px solid ${RED}`,
                    borderRadius: 6,
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Редактирование" name="can_edit">
                <Select
                  options={YES_NO_OPTIONS}
                  style={{
                    width: "100%",
                    border: `1px solid ${RED}`,
                    borderRadius: 6,
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Удаление" name="can_delete">
                <Select
                  options={YES_NO_OPTIONS}
                  style={{
                    width: "100%",
                    border: `1px solid ${RED}`,
                    borderRadius: 6,
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ===== МОДАЛКА: РАССМОТРЕНИЕ ЗАЯВКИ НА ПРОДЛЕНИЕ ГТД ===== */}
      <Modal
        title={
          <Space size={10}>
            <FieldTimeOutlined style={{ color: RED, fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: RED }}>
              Рассмотрение заявки на продление ГТД
            </span>
            {reviewingGtd?.gtd_number && (
              <Tag
                style={{
                  borderRadius: 8,
                  background: RED,
                  color: "#fff",
                  border: "none",
                  fontFamily: "monospace",
                  fontWeight: 700,
                }}
              >
                {reviewingGtd.gtd_number}
              </Tag>
            )}
          </Space>
        }
        open={isReviewOpen}
        onCancel={closeReviewModal}
        footer={[
          <Button key="cancel" danger onClick={closeReviewModal}>
            Отмена
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            icon={<CheckOutlined />}
            loading={reviewSubmitting}
            onClick={handleReviewSubmit}
            style={{ background: RED }}
          >
            Сохранить решение
          </Button>,
        ]}
        width={640}
        style={{ top: 60 }}
        destroyOnHidden
      >
        <Form
          form={reviewForm}
          layout="vertical"
          autoComplete="off"
          preserve={false}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Текущий дедлайн">
                <Input
                  value={formatDateShort(
                    reviewingGtd?.current_deadline ||
                      reviewingGtd?.gtd?.delivery_deadline,
                  )}
                  disabled
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Запрошенный дедлайн">
                <Input
                  value={formatDateShort(reviewingGtd?.requested_deadline)}
                  disabled
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Решение"
            name="decision"
            rules={[{ required: true, message: "Выберите решение" }]}
          >
            <Select
              style={{ border: `1px solid ${RED}` }}
              options={[
                { value: "approve", label: "Одобрить" },
                { value: "reject", label: "Отклонить" },
              ]}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.decision !== cur.decision}
          >
            {({ getFieldValue }) =>
              getFieldValue("decision") === "approve" ? (
                <Form.Item
                  label="Новый дедлайн (утверждённый)"
                  name="approved_deadline"
                  rules={[
                    {
                      required: true,
                      message: "Укажите утверждённый дедлайн",
                    },
                  ]}
                >
                  <DatePicker
                    style={{ width: "100%", borderRadius: 10 }}
                    format="YYYY-MM-DD"
                    placeholder="Выберите дату"
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            label="Комментарий"
            name="comment"
            rules={[{ required: true, message: "Комментарий обязателен" }]}
          >
            <TextArea
              rows={4}
              placeholder="Укажите причину или комментарий"
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ApprovalsPage;