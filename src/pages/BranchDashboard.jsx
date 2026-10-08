import { useEffect, useState, useMemo } from "react";
import {
  Table,
  Button,
  Space,
  Card,
  Form,
  Input,
  Typography,
  Tag,
  Empty,
  Spin,
  message,
  Row,
  Col,
  Tooltip,
  Modal,
  Popconfirm,
  Select,
  Avatar,
  Badge,
} from "antd";

import {
  SearchOutlined,
  BankOutlined,
  FilterOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  BellOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  TeamOutlined,
  HistoryOutlined,
} from "@ant-design/icons";

import { useParams, useNavigate } from "react-router-dom";

import { useBranchDashboardStore } from "../store/useBranchDashboard";
import { useBranchesAllStore } from "../store/useBranchesAll";
import { useAuthStore } from "../store/useAuth";

const { Title, Text } = Typography;

// === КРАСНАЯ ТЕМА ===
const redGradientText = {
  background: "linear-gradient(90deg, #ff4b4b, #e60026, #cf1322)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const redGradientBg = {
  background: "linear-gradient(135deg, #ff4b4b 0%, #e60026 100%)",
};

const CAN_CREATE = ["admin", "compliance", "operator"];
const CAN_EDIT = ["admin", "compliance"];
const CAN_DELETE = ["admin", "compliance", "currency_control"];
const CAN_MANAGE_USERS = ["admin", "compliance"];
const CAN_VIEW_HISTORY = ["admin", "compliance"];

const PHONE_SEPARATOR = ";";

const toArrayOfStrings = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const sep = value.includes(PHONE_SEPARATOR) ? PHONE_SEPARATOR : ",";
    return value
      .split(sep)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value, currency) => {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `${num.toLocaleString("ru-RU")} ${currency || ""}`.trim();
};

const pluralizeDays = (n) => {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return "дней";
  if (lastDigit > 1 && lastDigit < 5) return "дня";
  if (lastDigit === 1) return "день";
  return "дней";
};

const formatDaysShort = (value) => {
  const days = Number(value);
  if (Number.isNaN(days)) return "—";
  if (days < 0) return `Просрочен`;
  if (days === 0) return "Сегодня";
  return `${days} ${pluralizeDays(days)}`;
};

const calcDaysLeft = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

const getUrgency = (days) => {
  if (days === null || Number.isNaN(days)) {
    return {
      key: "unknown",
      label: "Нет данных",
      color: "#8c8c8c",
      border: "#d9d9d9",
      bg: "#f5f5f5",
      icon: <WarningOutlined />,
    };
  }
  if (days < 0) {
    return {
      key: "overdue",
      label: "Просрочен",
      color: "#cf1322",
      border: "#ffa39e",
      bg: "#fff1f0",
      icon: <WarningOutlined />,
    };
  }
  if (days <= 3) {
    return {
      key: "critical",
      label: "Срочно",
      color: "#fa541c",
      border: "#ffbb96",
      bg: "#fff2e8",
      icon: <ClockCircleOutlined />,
    };
  }
  if (days <= 7) {
    return {
      key: "warning",
      label: "Скоро",
      color: "#fa8c16",
      border: "#ffd591",
      bg: "#fff7e6",
      icon: <ClockCircleOutlined />,
    };
  }
  return {
    key: "ok",
    label: "В сроке",
    color: "#52c41a",
    border: "#b7eb8f",
    bg: "#f6ffed",
    icon: <CheckOutlined />,
  };
};

const getStatusLabel = (status) => {
  if (!status) return "—";
  const map = {
    approaching_deadline: "Приближается дедлайн",
    approaching: "Приближается",
    contract_expiry: "Истекает контракт",
    gtd_deadline: "Дедлайн ГТД",
    closed: "Закрыт",
    active: "Активен",
  };
  return map[status] || status;
};

const BranchDashboard = () => {
  const { id: branchId } = useParams();
  const navigate = useNavigate();

  const {
    companies,
    notifications,
    notificationsTotal,
    loading,
    loadingNotifications,
    error,
    setFilter,
    resetFilters,
    fetchDashboard,
    fetchNotifications,
    addCompany,
    editCompany,
    removeCompany,
    clear,
    clearError,
  } = useBranchDashboardStore();

  const { branchesAll } = useBranchesAllStore();
  const { role, user } = useAuthStore();

  const branch = Array.isArray(branchesAll)
    ? branchesAll.find((b) => String(b.id) === String(branchId))
    : null;

  const normalizedRole = String(role || "").toLowerCase();
  const canCreate = CAN_CREATE.includes(normalizedRole);
  const canEdit = CAN_EDIT.includes(normalizedRole);
  const canDelete = CAN_DELETE.includes(normalizedRole);
  const canManageUsers = CAN_MANAGE_USERS.includes(normalizedRole);
  const canViewHistory = CAN_VIEW_HISTORY.includes(normalizedRole);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const [searchType, setSearchType] = useState("name");
  const [notifFilter, setNotifFilter] = useState("all");

  const safeCompanies = Array.isArray(companies) ? companies : [];
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  useEffect(() => {
    fetchDashboard(branchId);
    fetchNotifications(branchId);
    return () => clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleRowClick = (record) => {
    const companyId = record.id ?? record.company_id;
    if (!companyId) return;
    navigate(`/branches/${branchId}/companies/${companyId}/contracts`);
  };

  const handleNotificationClick = (record) => {
    const companyId = record.company_id ?? record.companyId;
    if (!companyId) return;
    setIsNotificationsOpen(false);
    navigate(`/branches/${branchId}/companies/${companyId}/contracts`);
  };

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(true);
    fetchNotifications(branchId);
  };

  const handleOpenUsers = () => {
    navigate("/users-manage");
  };

  const handleOpenHistory = () => {
    navigate("/access-requests/history");
  };

  const enrichedNotifications = useMemo(() => {
    return safeNotifications.map((n, idx) => {
      const days =
        n.days_left !== undefined && n.days_left !== null
          ? Number(n.days_left)
          : calcDaysLeft(n.effective_end_date || n.deadline_date);

      return {
        ...n,
        _key: String(
          n.contract_id ??
            n.invoice_id ??
            n.contract_number ??
            `notif-${idx}`
        ),
        _days: days,
        _urgency: getUrgency(days),
      };
    });
  }, [safeNotifications]);

  const counts = useMemo(() => {
    const c = { all: 0, overdue: 0, critical: 0, warning: 0, ok: 0 };
    enrichedNotifications.forEach((n) => {
      c.all += 1;
      const k = n._urgency.key;
      if (c[k] !== undefined) c[k] += 1;
    });
    return c;
  }, [enrichedNotifications]);

  const visibleNotifications = useMemo(() => {
    if (notifFilter === "all") return enrichedNotifications;
    return enrichedNotifications.filter((n) => n._urgency.key === notifFilter);
  }, [enrichedNotifications, notifFilter]);

  const handleSearch = () => {
    const value = String(searchValue || "").trim();
    const filters = { query: value, search_type: searchType };
    setFilter("query", filters.query);
    setFilter("search_type", filters.search_type);
    fetchDashboard(branchId, filters);
  };

  const handleReset = () => {
    setSearchValue("");
    setSearchType("name");
    resetFilters();
    fetchDashboard(branchId, { query: "", search_type: "name" });
  };

  const openCreate = () => {
    createForm.resetFields();
    setIsCreateOpen(true);
  };

  const handleCreateCancel = () => {
    if (submitting) return;
    setIsCreateOpen(false);
  };

  const handleCreateAfterClose = () => {
    setSubmitting(false);
    createForm.resetFields();
  };

  const handleCreateSubmit = async () => {
    if (submitting) return;
    let values;
    try {
      values = await createForm.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    const inn = String(values.inn).trim();

    try {
      await addCompany(branchId, { inn });
      try {
        await fetchDashboard(branchId);
      } catch (refreshErr) {
        console.warn("Не удалось обновить список после создания:", refreshErr);
      }
      message.success("Карточка создана");
      setIsCreateOpen(false);
    } catch (e) {
      console.error("Ошибка создания:", e?.response?.data || e);
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось создать карточку"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (e, record) => {
    e?.stopPropagation?.();
    setEditingCompany(record);
    editForm.setFieldsValue({
      llc: record.llc || "",
      name: record.name || "",
      inn: record.inn || "",
      client_type: record.client_type || "",
      phones: toArrayOfStrings(record.phones).join(`${PHONE_SEPARATOR} `),
    });
    setIsEditOpen(true);
  };

  const handleEditCancel = () => {
    if (submitting) return;
    setIsEditOpen(false);
  };

  const handleEditAfterClose = () => {
    setEditingCompany(null);
    setSubmitting(false);
    editForm.resetFields();
  };

  const handleEditSubmit = async () => {
    if (submitting) return;
    if (!editingCompany) {
      message.error("Компания для редактирования не выбрана");
      return;
    }
    let values;
    try {
      values = await editForm.validateFields();
    } catch {
      return;
    }

    const isLegalEntity =
      editingCompany?.client_type === "legal_entity" ||
      editingCompany?.client_type === "Юридическое лицо";

    const payload = {
      accounts: editingCompany.accounts || [],
      client_type: values.client_type || "",
      inn: String(values.inn || "").trim(),
      llc: values.llc?.trim() || "",
      name: isLegalEntity ? "" : values.name?.trim() || "",
      phones: toArrayOfStrings(values.phones),
    };

    const companyId = editingCompany.id ?? editingCompany.company_id;
    if (!companyId) {
      message.error("Не найден ID компании");
      return;
    }
    setSubmitting(true);
    try {
      await editCompany(branchId, companyId, payload);
      try {
        await fetchDashboard(branchId);
      } catch (refreshErr) {
        console.warn(
          "Не удалось обновить список после редактирования:",
          refreshErr
        );
      }
      message.success("Карточка обновлена");
      setIsEditOpen(false);
    } catch (e) {
      console.error("Ошибка редактирования:", e?.response?.data || e);
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось обновить карточку"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, companyId) => {
    e?.stopPropagation?.();
    if (!companyId) {
      message.error("Не найден ID компании");
      return;
    }
    try {
      await removeCompany(branchId, companyId);
      try {
        await fetchDashboard(branchId);
      } catch (refreshErr) {
        console.warn("Не удалось обновить список после удаления:", refreshErr);
      }
      message.success("Карточка удалена");
    } catch (e) {
      console.error("Ошибка удаления:", e?.response?.data || e);
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось удалить карточку"
      );
    }
  };

  const getAuthor = (record) => {
    const creator = record?.creator || null;

    const rawLastName =
      creator?.last_name ||
      record?.last_name ||
      (record?.created_by === user?.login ? user?.last_name : null);

    const rawFirstName =
      creator?.first_name ||
      record?.first_name ||
      (record?.created_by === user?.login ? user?.first_name : null);

    const login =
      creator?.login ||
      record?.login ||
      record?.created_by ||
      (record?.created_by === user?.login ? user?.login : null);

    const email =
      creator?.email ||
      record?.email ||
      (record?.created_by === user?.login ? user?.email : null);

    const surname = rawFirstName || "";
    const name = rawLastName || "";
    const fullName = [surname, name].filter(Boolean).join(" ").trim();

    return { fullName, login, email };
  };

  const getClientTypeLabel = (values) => {
    if (values === "legal_entity") return "Юр.лицо";
    if (values === "individual") return "Физ.лицо";
    if (values === "sole_proprietor") return "ИП";
    return values || "-";
  };

  const notificationColumns = [
    {
      title: "№ договора",
      dataIndex: "contract_number",
      key: "contract_number",
      width: 170,
      render: (v, record) => {
        const u = record._urgency;
        return (
          <Space size={10} align="center">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: u.bg,
                border: `1px solid ${u.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: u.color,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              <FileTextOutlined />
            </div>
            <div style={{ minWidth: 0 }}>
              <Text
                strong
                style={{
                  display: "block",
                  fontSize: 13,
                  fontFamily: "monospace",
                  whiteSpace: "nowrap",
                }}
              >
                {v || record.invoice_number || "—"}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                ID: {record.company_id || record.contract_id || "—"}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: "Компания",
      dataIndex: "company_name",
      key: "company_name",
      width: 180,
      render: (v, record) => (
        <Text
          style={{ fontSize: 13 }}
          ellipsis={{ tooltip: v || record.title }}
        >
          {v || record.title || "—"}
        </Text>
      ),
    },
    {
      title: "Тип",
      dataIndex: "type",
      key: "type",
      width: 140,
      render: (v) => (
        <Tag
          style={{
            borderRadius: 6,
            fontSize: 11,
            padding: "0 8px",
            background: "#fff1f0",
            color: "#cf1322",
            border: "1px solid #ffa39e",
            margin: 0,
          }}
        >
          {v || "—"}
        </Tag>
      ),
    },
    {
      title: "Сумма",
      dataIndex: "invoice_amount",
      key: "invoice_amount",
      width: 130,
      render: (v, record) => (
        <Text strong style={{ fontSize: 13 }}>
          {formatMoney(v, record.currency)}
        </Text>
      ),
    },
    {
      title: "Осталось",
      dataIndex: "days_left",
      key: "days_left",
      width: 150,
      defaultSortOrder: "ascend",
      render: (_, record) => {
        const u = record._urgency;
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: u.bg,
              color: u.color,
              border: `1px solid ${u.border}`,
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {u.icon}
            {formatDaysShort(record._days)}
          </span>
        );
      },
    },
    {
      title: "Срок",
      key: "dates",
      width: 170,
      render: (_, record) => (
        <div style={{ lineHeight: 1.35 }}>
          <Text style={{ fontSize: 12, display: "block" }}>
            до {formatDate(record.effective_end_date)}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            дедлайн: {formatDate(record.deadline_date)}
          </Text>
        </div>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      width: 170,
      render: (v) => {
        const label = getStatusLabel(v);
        return (
          <Tag
            style={{
              borderRadius: 6,
              fontSize: 11,
              padding: "0 8px",
              background: "#fff1f0",
              color: "#cf1322",
              border: "1px solid #ffa39e",
              margin: 0,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </Tag>
        );
      },
    },
  ];

  const columns = [
    {
      title: "Название компании",
      dataIndex: "llc",
      key: "llc",
      width: 260,
      render: (v) => <Text style={{ fontSize: 14 }}>{v || "—"}</Text>,
    },
    {
      title: "ИНН",
      dataIndex: "inn",
      key: "inn",
      width: 160,
      render: (v) => (
        <Text
          type="secondary"
          style={{ fontSize: 13, fontFamily: "monospace" }}
        >
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Тип клиента",
      dataIndex: "client_type",
      key: "client_type",
      width: 160,
      render: (v) => (
        <Tag color="red" style={{ borderRadius: 8, fontWeight: 500 }}>
          {getClientTypeLabel(v)}
        </Tag>
      ),
    },
    {
      title: "Телефоны",
      dataIndex: "phones",
      key: "phones",
      width: 280,
      render: (phones) => {
        const list = toArrayOfStrings(phones);
        if (list.length === 0) return <Text type="secondary">—</Text>;
        return <Text style={{ fontSize: 14 }}>{list.join("; ")}</Text>;
      },
    },
    {
      title: "Создал",
      dataIndex: "created_by",
      key: "created_by",
      width: 420,
      render: (v, record) => {
        const { fullName, login, email } = getAuthor(record);
        if (!fullName && !login && !email) {
          return <Text type="secondary">—</Text>;
        }
        return (
          <Space size={6}>
            <Avatar
              size={20}
              style={{
                background: "#8b0000",
                fontSize: 10,
                marginRight: 10
              }}
            >
              {String(v || "?")
                .charAt(0)
                .toUpperCase()}
            </Avatar>
            <Text style={{ fontSize: 12 }}>
              {fullName && <Text strong>{fullName}</Text>}
              {login && (
                <Text
                  style={{
                    color: "#cf1322",
                    fontFamily: "monospace",
                    fontWeight: 500,
                  }}
                >
                  {fullName ? " • " : ""}
                  {login}
                </Text>
              )}
              {email && (
                <Text style={{ color: "#e60026", fontWeight: 600 }}>
                  {fullName || login ? " • " : ""}
                  {email}
                </Text>
              )}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Дата создания",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (v) => <Text type="secondary">{formatDateTime(v)}</Text>,
    },
    {
      title: "Дата изменения",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 180,
      render: (v) => <Text type="secondary">{formatDateTime(v)}</Text>,
    },
    ...(canEdit || canDelete
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 110,
            align: "right",
            render: (_, record) => {
              const id = record.id ?? record.company_id;
              return (
                <Space>
                  {canEdit && (
                    <Tooltip title="Редактировать">
                      <Button
                        type="text"
                        icon={<EditOutlined style={{ color: "#8b0000" }} />}
                        onClick={(e) => openEdit(e, record)}
                      />
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Popconfirm
                      title="Удалить карточку?"
                      description="Карточка будет перемещена в корзину."
                      okText="Удалить"
                      cancelText="Отмена"
                      okButtonProps={{ danger: true }}
                      onConfirm={(e) => handleDelete(e, id)}
                      onCancel={(e) => e?.stopPropagation?.()}
                    >
                      <Tooltip title="Удалить">
                        <Button
                          type="text"
                          icon={
                            <DeleteOutlined style={{ color: "#cf1322" }} />
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          },
        ]
      : []),
  ];

 const renderSearchTypeButton = (value, label) => {
  return (
    <Button
      key={value}
      danger
      type="primary"
      onClick={() => setSearchType(value)}
      style={{
        borderRadius: 10,
        fontWeight: 600,
        background: "#8b0000",
        border: "none",
        boxShadow: "0 6px 16px rgba(230,0,38,0.28)",
      }}
    >
      {label}
    </Button>
  );
};
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
              // ...redGradientBg,
              background: '#8b0000',
              boxShadow: "0 10px 24px rgba(230,0,38,0.28)",
              flexShrink: 0,
            }}
          >
            <BankOutlined style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: '#8b0000' }}
            >
              {branch ? ` ${branch.name}` : ""}
            </Title>
            <Space size={10} style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                ID филиала:
              </Text>
              <Tag
                color="#8b0000"
                style={{
                  color: '#8b0000',
                  borderRadius: 8,
                  padding: "1px 10px",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {branchId}
              </Tag>
            </Space>
          </div>
        </Space>

        <Space wrap>
          <Badge
            count={notificationsTotal}
            showZero={false}
            overflowCount={99}
            style={{
              backgroundColor: "#8b0000",
              boxShadow: "0 0 0 1px #fff",
            }}
          >
            <Button
              danger
              icon={<BellOutlined />}
              onClick={handleOpenNotifications}
              style={{ borderRadius: 12, height: 35, border: '#8b0000', background: '#8b0000', color: '#fff' }}
            >
              Уведомления
            </Button>
          </Badge>
          {canCreate && (
            <Button
              danger
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
              style={{ borderRadius: 12, height: 35, border: '#8b0000', background: '#8b0000', color: '#fff' }}
            >
              Создать компанию
            </Button>
          )}
          <Button
            danger
            onClick={() => navigate(-1)}
            style={{ borderRadius: 12, height: 35, }}
          >
            Назад
          </Button>
        </Space>
      </div>

      <Card
        style={{
          marginBottom: 20,
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        }}
        bodyStyle={{ padding: 20 }}
      >
        <Space align="center" size={10} style={{ marginBottom: 16 }}>
          <FilterOutlined style={{ color: "#8b0000", fontSize: 16 }} />
          <Text strong style={{ fontSize: 15, color: "#8b0000", }}>
            Поиск
          </Text>
        </Space>

        <div style={{ marginBottom: 16 }}>
          <Text style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
            Поле поиска:
          </Text>
          <Space size={8} wrap>
            {renderSearchTypeButton("name", "Название компании")}
            {renderSearchTypeButton("inn", "ИНН")}
            {renderSearchTypeButton("amount", "Сумма")}
          </Space>
        </div>

        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={17} lg={19}>
            <div>
              <Text style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
                {searchType === "name" && "Название компании"}
                {searchType === "inn" && "ИНН"}
                {searchType === "amount" && "Сумма"}
              </Text>
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={
                  searchType === "name"
                    ? "Введите название компании"
                    : searchType === "inn"
                      ? "Введите ИНН (9 цифр)"
                      : "Введите сумму"
                }
                allowClear
                onPressEnter={handleSearch}
                style={{ borderRadius: 10, height: 40, width: "100%" }}
              />
            </div>
          </Col>

          <Col xs={24} md={7} lg={5}>
            <Space size={8} style={{ width: "100%", display: "flex" }}>
              <Button
                type="primary"
                danger
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 10,
                  height: 35,
                  background: "#8b0000",
                  border: "none",
                  boxShadow: "0 6px 16px rgba(230,0,38,0.28)",
                  fontWeight: 600,
                }}
              >
                Поиск
              </Button>
              <Button
                onClick={handleReset}
                style={{
                  background: '#8b0000',
                  color: '#fff',
                  border: "#8b0000",
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 10,
                  height: 35,
                }}
              >
                Сбросить
              </Button>
            </Space>
          </Col>
        </Row>

        <Text
          type="secondary"
          style={{ display: "block", marginTop: 10, fontSize: 12 }}
        >
          Выберите поле поиска (Название / ИНН / Сумма), введите значение и
          нажмите «Поиск».
        </Text>
      </Card>
      <Card
        style={{
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
        bodyStyle={{ padding: 0 }}
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
            <BankOutlined style={{ color: "#8b0000", fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: "#8b0000", }}>
              Компании филиала
            </Text>
          </Space>
          <Tag
            color="red"
            style={{
              borderRadius: 8,
              padding: "2px 12px",
              fontWeight: 600,
              fontSize: 13,
              color: "#8b0000",
            }}
          >
            Всего: {safeCompanies.length}
          </Tag>
        </div>

        <div style={{ padding: 20 }}>
          {loading && safeCompanies.length === 0 ? (
            <div
              style={{
                minHeight: 300,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Spin size="middle" style={{ color: "#e60026" }} />
            </div>
          ) : (
            <Table
              className="red-table"
              rowKey={(r) => String(r.id ?? r.company_id ?? Math.random())}
              loading={loading}
              columns={columns}
              dataSource={safeCompanies}
              scroll={{ x: 1400 }}
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
                style: { cursor: "pointer" },
              })}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                pageSizeOptions: ["10", "20", "50", "100"],
                showTotal: (total) => (
                  <span
                    style={{
                      color: "#8b0000",
                      fontWeight: 600,
                      position: "relative",
                      top: 2,
                    }}
                  >
                    Всего компаний: {total}
                  </span>
                ),
                style: { marginTop: 16 },
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: "#999" }}>Компаний пока нет</span>
                    }
                  />
                ),
              }}
            />
          )}
        </div>
      </Card>

      {/* ===== МОДАЛКА УВЕДОМЛЕНИЙ ===== */}
      <Modal
        title={
          <Space size={10}>
            <BellOutlined style={{ color: "#ff4b4b", fontSize: 18 }} />
            <span style={{ fontWeight: 700, ...redGradientText }}>
              Уведомления по контрактам
            </span>
            <Badge
              count={notificationsTotal}
              showZero
              style={{
                backgroundColor: notificationsTotal > 0 ? "#ff4b4b" : "#ccc",
              }}
            />
          </Space>
        }
        open={isNotificationsOpen}
        onCancel={() => setIsNotificationsOpen(false)}
        footer={[
          <Button
            key="close"
            danger
            icon={<CloseOutlined />}
            onClick={() => setIsNotificationsOpen(false)}
            style={{ borderRadius: 10 }}
          >
            Закрыть
          </Button>,
        ]}
        width={1200}
        style={{ top: 120 }}
        styles={{
          body: { maxHeight: "72vh", overflowY: "auto" },
          wrapper: { marginLeft: 120 },
        }}
        destroyOnHidden
        maskClosable
        keyboard
      >
        <Text
          type="secondary"
          style={{ display: "block", marginBottom: 16, fontSize: 13 }}
        >
          Контракты, срок действия которых истекает в ближайшие 10 дней или уже
          истёк.
        </Text>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[
            { key: "all", label: "Все", color: "#e60026" },
            { key: "overdue", label: "Просроченные", color: "#cf1322" },
            { key: "critical", label: "Срочные (≤3)", color: "#fa541c" },
            { key: "warning", label: "Скоро (≤7)", color: "#fa8c16" },
            { key: "ok", label: "В сроке", color: "#52c41a" },
          ].map((f) => {
            const isActive = notifFilter === f.key;
            const count = counts[f.key] ?? 0;
            return (
              <div
                key={f.key}
                onClick={() => setNotifFilter(f.key)}
                style={{
                  cursor: "pointer",
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: isActive ? "#fff" : f.color,
                  background: isActive ? f.color : `${f.color}15`,
                  border: `1px solid ${isActive ? f.color : `${f.color}44`}`,
                  transition: "all .15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {f.label}
                <span
                  style={{
                    background: isActive
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(0,0,0,0.06)",
                    borderRadius: 999,
                    padding: "0 7px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {loadingNotifications ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin size="middle" />
          </div>
        ) : visibleNotifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: "#999" }}>
                {safeNotifications.length === 0
                  ? "Нет контрактов с истекающим сроком"
                  : "Нет контрактов в этой категории"}
              </span>
            }
            style={{ padding: "40px 0" }}
          />
        ) : (
          <Table
            className="red-table"
            rowKey={(r) => r._key}
            columns={notificationColumns}
            dataSource={visibleNotifications}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              showTotal: (total) => (
                <span style={{ color: "#ff4d4f", fontWeight: 600 }}>
                  Всего контрактов: {total}
                </span>
              ),
            }}
            tableLayout="fixed"
            size="middle"
            onRow={(record) => ({
              onClick: () => handleNotificationClick(record),
              style: {
                cursor: "pointer",
                transition: "background .15s ease",
                borderLeft: `3px solid ${record._urgency.color}`,
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.background = record._urgency.bg;
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.background = "transparent";
              },
            })}
          />
        )}
      </Modal>
      <Modal
        title={
          <span style={{ fontWeight: 700, color: '#8b0000' }}>
            Создать компанию
          </span>
        }
        open={isCreateOpen}
        onCancel={handleCreateCancel}
        afterClose={handleCreateAfterClose}
        maskClosable={false}
        keyboard={false}
        destroyOnHidden
        forceRender
        width={480}
        style={{ top: 160 }}
        footer={[
          <Button
            key="submit"
            danger
            type="primary"
            icon={<CheckOutlined />}
            loading={submitting}
            onClick={handleCreateSubmit}
            style={{ borderRadius: 10, background: '#8b0000',}}
          >
            Сохранить
          </Button>,
          <Button
            key="cancel"
            danger
            icon={<CloseOutlined />}
            disabled={submitting}
            onClick={handleCreateCancel}
            style={{ borderRadius: 10, background: '#8b0000', color: '#fff', border: '1px solid #8b0000' }}
          >
            Отмена
          </Button>,
        ]}
      >
        <Form form={createForm} layout="vertical" autoComplete="off">
          <Form.Item
            label="ИНН"
            name="inn"
            rules={[
              { required: true, message: "Введите ИНН" },
              { len: 9, message: "ИНН должен содержать 9 цифр" },
            ]}
          >
            <Input
              placeholder="Введите ИНН"
              maxLength={9}
              onPressEnter={handleCreateSubmit}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Введите ИНН. Система автоматически найдёт клиента в АБС, определит
            тип клиента (физ. лицо / юр. лицо / ИП), подтянет ФИО, телефоны и
            название организации.
          </Text>
        </Form>
      </Modal>

      {/* ===== МОДАЛКА РЕДАКТИРОВАНИЯ КОМПАНИИ ===== */}
      <Modal
        title={
          <span style={{ fontWeight: 700, ...redGradientText }}>
            Редактировать карточку
          </span>
        }
        open={isEditOpen}
        onCancel={handleEditCancel}
        afterClose={handleEditAfterClose}
        maskClosable={false}
        keyboard={false}
        destroyOnHidden
        forceRender
        width={560}
        style={{ top: 150 }}
        footer={[
          <Button
            key="submit"
            danger
            type="primary"
            icon={<CheckOutlined />}
            loading={submitting}
            onClick={handleEditSubmit}
            style={{ borderRadius: 10 }}
          >
            Сохранить
          </Button>,
          <Button
            key="cancel"
            danger
            icon={<CloseOutlined />}
            disabled={submitting}
            onClick={handleEditCancel}
            style={{ borderRadius: 10 }}
          >
            Отмена
          </Button>,
        ]}
      >
        <Form form={editForm} layout="vertical" autoComplete="off">
          {editingCompany?.client_type !== "legal_entity" &&
            editingCompany?.client_type !== "Юридическое лицо" && (
              <Form.Item label="ФИО" name="name">
                <Input
                  maxLength={500}
                  placeholder="Введите ФИО"
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            )}

          <Form.Item
            label="Название компании"
            name="llc"
            rules={[{ required: true, message: "Введите название компании" }]}
          >
            <Input
              maxLength={255}
              placeholder="Введите название ҶДММ"
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item
            label="ИНН"
            name="inn"
            rules={[{ required: true, message: "Введите ИНН" }]}
          >
            <Input
              maxLength={9}
              placeholder="Введите ИНН"
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item
            label="Тип клиента"
            name="client_type"
            rules={[{ required: true, message: "Выберите тип клиента" }]}
          >
            <Select
              placeholder="Выберите тип клиента"
              options={[
                { value: "legal_entity", label: "Юр.лицо" },
                { value: "individual", label: "Физ.лицо" },
                { value: "sole_proprietor", label: "ИП" },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Телефоны"
            name="phones"
            tooltip="Несколько номеров телефона указывайте через точку с запятой (;). Первый номер должен начинаться с 992."
          >
            <Input
              placeholder="Введите номера телефона"
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BranchDashboard;