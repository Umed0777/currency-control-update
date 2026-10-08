import { useEffect, useState } from "react";
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
  CalendarOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  RiseOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useApprovalsStore } from "../store/useApprovalsStore";
import { useAuthStore } from "../store/useAuth";

const { Title, Text } = Typography;
const { TextArea } = Input;

const RED = "#8b0000";

// === Этапы согласования ===
const STAGE_MAP = {
  currency_control: { label: "Валютный контроль", color: "gold" },
  compliance: { label: "Комплаенс", color: "purple" },
  revision: { label: "На доработке", color: "orange" },
};

// === Типы документов ===
const ENTITY_TYPE_MAP = {
  contract: { label: "Контракт", color: "red" },
  invoice: { label: "Инвойс", color: "blue" },
  gtd: { label: "ГТД", color: "green" },
  additional_agreement: { label: "Доп. соглашение", color: "purple" },
};

// === Статусы ===
const STATUS_MAP = {
  pending: { label: "В ожидании", color: "gold" },
  pending_currency_control: {
    label: "На валютном контроле",
    color: "orange",
  },
  pending_compliance: { label: "На комплаенсе", color: "purple" },
  revision: { label: "На доработке", color: "volcano" },
  approved: { label: "Одобрено", color: "green" },
  accepted: { label: "Принято", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
  declined: { label: "Отклонено", color: "red" },
  archived: { label: "В архиве", color: "default" },
};

// === Статусы заявок на продление ГТД ===
const GTD_EXTENSION_STATUS_MAP = {
  pending: { label: "В ожидании", color: "gold" },
  pending_currency_control: {
    label: "На валютном контроле",
    color: "orange",
  },
  approved: { label: "Одобрено", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
};

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

const ApprovalsPage = () => {
  const navigate = useNavigate();
  const { role, branchId: userBranchId } = useAuthStore();
  const normalizedRole = String(role || "").toLowerCase();

  // ✅ Единый флаг «админ» — учитываем варианты написания
  const isAdmin =
    normalizedRole === "admin" ||
    normalizedRole === "administrator" ||
    normalizedRole === "администратор";

  const canCompliance = isAdmin || normalizedRole === "compliance";
  const canCurrencyControl = isAdmin || normalizedRole === "currency_control";
  const canReviewGtd =
    isAdmin ||
    normalizedRole === "compliance" ||
    normalizedRole === "currency_control";

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
    gtdItems,
    gtdTotal,
    gtdLoading,
    fetchPending,
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
  } = useApprovalsStore();

  const [activeTab, setActiveTab] = useState("pending");
  const [stageFilter, setStageFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [decisionType, setDecisionType] = useState("compliance");

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewingGtd, setReviewingGtd] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [gtdPage, setGtdPage] = useState(1);
  const [gtdPageSize] = useState(20);

  const [decisionForm] = Form.useForm();
  const [grantForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  // ============================================================
  // ЭФФЕКТЫ
  // ============================================================
  useEffect(() => {
    if (activeTab === "pending") {
      fetchPending({ stage: stageFilter, entity_type: entityTypeFilter }).catch(
        () => {},
      );
    }
    if (activeTab === "permissions" && canCompliance) {
      fetchPermissions().catch(() => {});
    }
    if (activeTab === "gtd_extensions" && canReviewGtd) {
      fetchGtdPending(userBranchId, gtdPage, gtdPageSize).catch(() => {});
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
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  // ============================================================
  // PENDING
  // ============================================================
  const handleOpenDetail = async (record) => {
    setIsDetailOpen(true);
    try {
      await fetchDetail(record.entity_type, record.entity_id || record.id);
    } catch {
      // ошибка в сторе
    }
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    clearDetail();
  };

  const handleOpenDecision = (type) => {
    setDecisionType(type);
    decisionForm.resetFields();
    setIsDecisionOpen(true);
  };

  const handleSubmitDecision = async () => {
    let values;
    try {
      values = await decisionForm.validateFields();
    } catch {
      return;
    }
    if (!detail) return;

    const payload = {
      decision: values.decision,
      comment: values.comment || "",
    };

    try {
      if (decisionType === "compliance") {
        await submitCompliance(
          detail.entity_type,
          detail.entity_id || detail.id,
          payload,
        );
        message.success("Решение комплаенса сохранено");
      } else {
        await submitCurrencyControl(
          detail.entity_type,
          detail.entity_id || detail.id,
          payload,
        );
        message.success("Решение валютного контроля сохранено");
      }
      setIsDecisionOpen(false);
      setIsDetailOpen(false);
      clearDetail();
      fetchPending({ stage: stageFilter, entity_type: entityTypeFilter });
    } catch (e) {
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось сохранить решение",
      );
    }
  };

  // ============================================================
  // PERMISSIONS
  // ============================================================
  const handleGrantPermission = async () => {
    let values;
    try {
      values = await grantForm.validateFields();
    } catch {
      return;
    }
    try {
      await grantPermission({
        login: values.login,
        can_create: values.can_create,
        can_edit: values.can_edit,
        can_delete: values.can_delete,
      });
      message.success("Доступ выдан");
      setIsGrantOpen(false);
      grantForm.resetFields();
    } catch (e) {
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось выдать доступ",
      );
    }
  };

  const handleRevokePermission = async (login) => {
    try {
      await revokePermission(login);
      message.success("Доступ отозван");
    } catch (e) {
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось отозвать доступ",
      );
    }
  };

  // ============================================================
  // GTD EXTENSIONS
  // ============================================================
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
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось рассмотреть заявку",
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ============================================================
  // КОЛОНКИ: PENDING
  // ============================================================
  const pendingColumns = [
    {
      title: "Документ",
      key: "document",
      width: 240,
      render: (_, record) => (
        <Space size={10} align="center">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "#fff1f0",
              border: "1px solid #ffa39e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#cf1322",
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
              }}
            >
              {record.document_number || record.number || "—"}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              ID: {record.entity_id || record.id}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Тип",
      dataIndex: "entity_type",
      key: "entity_type",
      width: 150,
      render: (v) => {
        const info = ENTITY_TYPE_MAP[v] || {
          label: v || "—",
          color: "default",
        };
        return (
          <Tag color={info.color} style={{ borderRadius: 8 }}>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: "Клиент",
      dataIndex: "counterparty_name",
      key: "counterparty_name",
      width: 200,
      render: (v) => (
        <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Сумма",
      key: "amount",
      width: 140,
      render: (_, record) => (
        <Text strong style={{ fontSize: 13 }}>
          {formatMoney(record.amount, record.currency)}
        </Text>
      ),
    },
    {
      title: "Этап",
      dataIndex: "stage",
      key: "stage",
      width: 180,
      render: (v) => {
        const info = STAGE_MAP[v] || { label: v || "—", color: "default" };
        return (
          <Tag color={info.color} style={{ borderRadius: 8 }}>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: "Статус",
      dataIndex: "approval_status",
      key: "approval_status",
      width: 180,
      render: (v) => {
        const info = STATUS_MAP[v] || { label: v || "—", color: "default" };
        return (
          <Tag color={info.color} style={{ borderRadius: 8 }}>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: "Филиал",
      dataIndex: "branch_name",
      key: "branch_name",
      width: 150,
      render: (v) => <Text style={{ fontSize: 13 }}>{v || "—"}</Text>,
    },
    {
      title: "Создан",
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (v) => <Text type="secondary">{formatDateTime(v)}</Text>,
    },
    {
      title: "Действие",
      key: "actions",
      width: 100,
      align: "right",
      render: (_, record) => (
        <Tooltip title="Открыть">
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: RED }} />}
            onClick={() => handleOpenDetail(record)}
          />
        </Tooltip>
      ),
    },
  ];

  // ============================================================
  // КОЛОНКИ: PERMISSIONS
  // ============================================================
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
    ...(canCompliance
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 100,
            align: "right",
            render: (_, record) => (
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => handleRevokePermission(record.login)}
              />
            ),
          },
        ]
      : []),
  ];

  // ============================================================
  // КОЛОНКИ: GTD EXTENSIONS
  // ============================================================
  const gtdColumns = [
    {
      title: "ГТД",
      key: "gtd",
      width: 220,
      render: (_, record) => (
        <Space size={10} align="center">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#389e0d",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            <FieldTimeOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <Text
              strong
              style={{
                display: "block",
                fontSize: 13,
                fontFamily: "monospace",
              }}
            >
              {record.gtd_number || record.gtd?.gtd_number || "—"}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              ID: {record.gtd_id || record.gtd?.id || record.id}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Текущий дедлайн",
      dataIndex: "current_deadline",
      key: "current_deadline",
      width: 160,
      render: (v, record) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: RED, fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>
            {formatDateShort(v || record.gtd?.delivery_deadline)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Запрошенный дедлайн",
      dataIndex: "requested_deadline",
      key: "requested_deadline",
      width: 180,
      render: (v) => (
        <Space size={4}>
          <RiseOutlined style={{ color: "#52c41a", fontSize: 12 }} />
          <Text strong style={{ fontSize: 13 }}>
            {formatDateShort(v)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      width: 180,
      render: (v) => {
        const info = GTD_EXTENSION_STATUS_MAP[v] || {
          label: v || "—",
          color: "default",
        };
        return (
          <Tag color={info.color} style={{ borderRadius: 8 }}>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: "Заявитель",
      key: "creator",
      width: 220,
      render: (_, record) => {
        const creator = record.creator || {};
        const fullName = [creator.first_name, creator.last_name]
          .filter(Boolean)
          .join(" ");
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12, fontWeight: 600 }}>
              {fullName || "—"}
            </Text>
            <Text style={{ fontSize: 11, color: RED }}>
              {creator.login || record.created_by || ""}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Документ-обоснование",
      dataIndex: "document_path",
      key: "document_path",
      width: 220,
      render: (v) => {
        if (!v) return <Text type="secondary">—</Text>;
        const fileName = String(v).split(/[\\/]/).pop();
        return (
          <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: v }}>
            {fileName}
          </Text>
        );
      },
    },
    {
      title: "Дата заявки",
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (v) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: RED, fontSize: 11 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(v)}
          </Text>
        </Space>
      ),
    },
    ...(canReviewGtd
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 180,
            align: "center",
            render: (_, record) => (
              <Space size={4}>
                <Tooltip title="Одобрить">
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined style={{ color: "#389e0d" }} />}
                    onClick={() => {
                      setReviewingGtd(record);
                      reviewForm.resetFields();
                      reviewForm.setFieldsValue({
                        decision: "approve",
                        approved_deadline: record.requested_deadline
                          ? dayjs(record.requested_deadline)
                          : null,
                        comment: "",
                      });
                      setIsReviewOpen(true);
                    }}
                  />
                </Tooltip>
                <Tooltip title="Отклонить">
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined style={{ color: "#cf1322" }} />}
                    onClick={() => {
                      setReviewingGtd(record);
                      reviewForm.resetFields();
                      reviewForm.setFieldsValue({
                        decision: "reject",
                        comment: "",
                      });
                      setIsReviewOpen(true);
                    }}
                  />
                </Tooltip>
              </Space>
            ),
          },
        ]
      : []),
  ];

  // ============================================================
  // ВКЛАДКИ
  // ============================================================
  const tabItems = [
    {
      key: "pending",
      label: (
        <Space size={6}>
          <AuditOutlined style={{ color: RED }} />
          <span style={{ color: RED, fontWeight: 600 }}>На согласовании</span>
          {total > 0 && (
            <Badge
              count={total}
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
            bodyStyle={{ padding: 20 }}
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
                    setStageFilter(v);
                    setPage(1);
                  }}
                  style={{
                    width: "100%",
                    height: 35,
                    border: `1px solid ${RED}`,
                  }}
                  allowClear
                  placeholder="Все этапы"
                  options={[
                    { value: "", label: "Все этапы" },
                    { value: "currency_control", label: "Валютный контроль" },
                    { value: "compliance", label: "Комплаенс" },
                    { value: "revision", label: "На доработке" },
                  ]}
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
                    setEntityTypeFilter(v);
                    setPage(1);
                  }}
                  style={{
                    width: "100%",
                    height: 35,
                    border: `1px solid ${RED}`,
                  }}
                  allowClear
                  placeholder="Все типы"
                  options={[
                    { value: "", label: "Все типы" },
                    { value: "contract", label: "Контракт" },
                    { value: "invoice", label: "Инвойс" },
                    { value: "gtd", label: "ГТД" },
                    {
                      value: "additional_agreement",
                      label: "Доп. соглашение",
                    },
                  ]}
                />
              </Col>
            </Row>
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
                <AuditOutlined style={{ color: RED, fontSize: 16 }} />
                <Text strong style={{ fontSize: 15, color: RED }}>
                  Ожидают согласования
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
                Всего: {total}
              </Tag>
            </div>

            <div style={{ padding: 20 }}>
              {loading && items.length === 0 ? (
                <div
                  style={{
                    minHeight: 300,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Spin size="middle" />
                </div>
              ) : (
                <Table
                  className="red-table"
                  rowKey={(r) =>
                    `${r.entity_type}-${r.entity_id ?? r.id}-${Math.random()}`
                  }
                  loading={loading}
                  columns={pendingColumns}
                  dataSource={items}
                  scroll={{ x: "max-content" }}
                  pagination={{
                    current: page,
                    pageSize: pageSize,
                    total: total,
                    showSizeChanger: false,
                    onChange: (p) => setPage(p),
                  }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <span style={{ color: "#999" }}>
                            Нет документов на согласовании
                          </span>
                        }
                      />
                    ),
                  }}
                />
              )}
            </div>
          </Card>
        </>
      ),
    },
  ];

  // Вкладка прав ВК
  if (canCompliance) {
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
              <KeyOutlined style={{ color: RED, fontSize: 16 }} />
              <Text strong style={{ fontSize: 15, color: RED }}>
                Права доступа ВК
              </Text>
            </Space>
            <Space>
              <Badge
                count={permissions.length}
                showZero
                style={{ backgroundColor: RED }}
              >
                <Tag color="red" style={{ borderRadius: 8 }}>
                  Всего: {permissions.length}
                </Tag>
              </Badge>
              <Button
                danger
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsGrantOpen(true)}
                style={{
                  borderRadius: 10,
                  height: 36,
                  background: RED,
                  border: "none",
                }}
              >
                Выдать доступ
              </Button>
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
                <Spin size="middle" />
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

  // Вкладка заявок на продление ГТД
  if (canReviewGtd) {
    tabItems.push({
      key: "gtd_extensions",
      label: (
        <Space size={6}>
          <FieldTimeOutlined style={{ color: RED }} />
          <span style={{ color: RED, fontWeight: 600 }}>Продление ГТД</span>
          {/* {gtdTotal > 0 && (
            <Badge
              count={gtdTotal}
              style={{ backgroundColor: "#fa8c16", boxShadow: "none" }}
            />
          )} */}
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
              <FieldTimeOutlined style={{ color: RED, fontSize: 16 }} />
              <Text strong style={{ fontSize: 15, color: RED }}>
                Заявки на продление срока ГТД
              </Text>
            </Space>
            <Space>
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
                Всего: {gtdTotal}
              </Tag>
              <Button
                danger
                icon={<ReloadOutlined />}
                onClick={() =>
                  fetchGtdPending(userBranchId, gtdPage, gtdPageSize)
                }
                loading={gtdLoading}
                style={{
                  borderRadius: 10,
                  height: 34,
                  background: RED,
                  color: "#fff",
                  border: `1px solid ${RED}`,
                }}
              >
                Обновить
              </Button>
            </Space>
          </div>

          <div style={{ padding: 20 }}>
            {gtdLoading && gtdItems.length === 0 ? (
              <div
                style={{
                  minHeight: 300,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Spin size="middle" />
              </div>
            ) : (
              <Table
                className="red-table"
                rowKey={(r) => String(r.id ?? Math.random())}
                loading={gtdLoading}
                columns={gtdColumns}
                dataSource={gtdItems}
                scroll={{ x: "max-content" }}
                pagination={{
                  current: gtdPage,
                  pageSize: gtdPageSize,
                  total: gtdTotal,
                  showSizeChanger: false,
                  onChange: (p) => setGtdPage(p),
                }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span style={{ color: "#999" }}>
                          Заявок на продление нет
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

  // ============================================================
  // RENDER
  // ============================================================
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
                fetchPending({
                  stage: stageFilter,
                  entity_type: entityTypeFilter,
                });
              } else if (activeTab === "permissions") {
                fetchPermissions();
              } else if (activeTab === "gtd_extensions") {
                fetchGtdPending(userBranchId, gtdPage, gtdPageSize);
              }
            }}
            loading={loading || permissionsLoading || gtdLoading}
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
        onCancel={handleCloseDetail}
        footer={[
          canCompliance && (
            <Button
              key="compliance"
              type="primary"
              danger
              icon={<CheckOutlined />}
              onClick={() => handleOpenDecision("compliance")}
              style={{ borderRadius: 10, background: RED }}
            >
              Решение комплаенс
            </Button>
          ),
          canCurrencyControl && (
            <Button
              key="cc"
              type="primary"
              danger
              icon={<CheckOutlined />}
              onClick={() => handleOpenDecision("currency_control")}
              style={{ borderRadius: 10, background: RED }}
            >
              Решение Валютного контроля
            </Button>
          ),
          <Button key="close" danger onClick={handleCloseDetail}>
            Закрыть
          </Button>,
        ].filter(Boolean)}
        width={820}
        style={{ top: 60 }}
        destroyOnHidden
      >
        {detailLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin size="middle" />
          </div>
        ) : detailError ? (
          <Empty
            description={
              <span style={{ color: "#cf1322" }}>{detailError}</span>
            }
          />
        ) : !detail ? (
          <Empty description="Нет данных" />
        ) : (
          <>
            <Descriptions
              bordered
              column={2}
              size="small"
              labelStyle={{
                background: "#fafafa",
                fontWeight: 600,
                fontSize: 12,
                width: 180,
              }}
              contentStyle={{ fontSize: 13 }}
            >
              <Descriptions.Item label="Тип">
                <Tag
                  color={
                    ENTITY_TYPE_MAP[detail.entity_type]?.color || "default"
                  }
                >
                  {ENTITY_TYPE_MAP[detail.entity_type]?.label ||
                    detail.entity_type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="ID">
                {detail.entity_id || detail.id}
              </Descriptions.Item>
              <Descriptions.Item label="Номер">
                {detail.document_number || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Дата документа">
                {detail.document_date || "—"}
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
                <Tag
                  color={STATUS_MAP[detail.approval_status]?.color || "default"}
                >
                  {STATUS_MAP[detail.approval_status]?.label ||
                    detail.approval_status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Создал" span={2}>
                {getPersonName(detail.creator) || "—"}
                {detail.creator?.login ? ` (@${detail.creator.login})` : ""}
              </Descriptions.Item>
              <Descriptions.Item label="Создан" span={2}>
                {formatDateTime(detail.created_at)}
              </Descriptions.Item>
            </Descriptions>

            {detail.compliance_decision && (
              <>
                <Divider style={{ margin: "16px 0" }}>Комплаенс</Divider>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Решение">
                    {detail.compliance_decision}
                  </Descriptions.Item>
                  <Descriptions.Item label="Комментарий">
                    {detail.compliance_comment || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Проверил">
                    {getPersonName(detail.compliance_reviewer) || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Дата">
                    {formatDateTime(detail.compliance_reviewed_at)}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {detail.currency_control_decision && (
              <>
                <Divider style={{ margin: "16px 0" }}>
                  Валютный контроль
                </Divider>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Решение">
                    {detail.currency_control_decision}
                  </Descriptions.Item>
                  <Descriptions.Item label="Комментарий">
                    {detail.currency_control_comment || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Проверил">
                    {getPersonName(detail.currency_control_reviewer) || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Дата">
                    {formatDateTime(detail.currency_control_reviewed_at)}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}
          </>
        )}
      </Modal>

      {/* ===== МОДАЛКА: РЕШЕНИЕ ===== */}
      <Modal
        title={
          <Space size={10}>
            <ExclamationCircleOutlined style={{ color: RED, fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: RED }}>
              {decisionType === "compliance"
                ? "Решение комплаенс-контроля"
                : "Решение валютного контроля"}
            </span>
          </Space>
        }
        open={isDecisionOpen}
        onCancel={() => setIsDecisionOpen(false)}
        footer={[
          <Button
            style={{ background: RED }}
            key="submit"
            type="primary"
            danger
            icon={<CheckOutlined />}
            loading={submitting}
            onClick={handleSubmitDecision}
          >
            Сохранить
          </Button>,
          <Button key="cancel" danger onClick={() => setIsDecisionOpen(false)}>
            Отмена
          </Button>,
        ]}
        width={600}
        destroyOnHidden
      >
        <Form form={decisionForm} layout="vertical" autoComplete="off">
          <Form.Item
            label="Решение"
            name="decision"
            rules={[{ required: true, message: "Выберите решение" }]}
          >
            <Select
              style={{ border: `1px solid ${RED}` }}
              placeholder="Выберите решение"
              options={
                decisionType === "compliance"
                  ? [
                      { value: "approve", label: "Одобрить" },
                      { value: "reject", label: "Отклонить" },
                    ]
                  : [
                      { value: "accepted", label: "Принято" },
                      { value: "revision", label: "На доработку" },
                      { value: "rejected", label: "Отклонено" },
                    ]
              }
            />
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

      {/* ===== МОДАЛКА: ВЫДАТЬ ДОСТУП ВК ===== */}
      <Modal
        title={
          <Space size={10}>
            <KeyOutlined style={{ color: RED, fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: RED }}>
              Выдать доступ валютному контролю
            </span>
          </Space>
        }
        open={isGrantOpen}
        onCancel={() => setIsGrantOpen(false)}
        footer={[
          <Button key="cancel" danger onClick={() => setIsGrantOpen(false)}>
            Отмена
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            icon={<CheckOutlined />}
            loading={submitting}
            onClick={handleGrantPermission}
            style={{ background: RED }}
          >
            Выдать
          </Button>,
        ]}
        width={520}
        destroyOnHidden
      >
        <Form form={grantForm} layout="vertical" autoComplete="off">
          <Form.Item
            label="Логин"
            name="login"
            rules={[{ required: true, message: "Введите логин" }]}
          >
            <Input
              placeholder="Введите логин сотрудника"
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Создание"
                name="can_create"
                valuePropName="checked"
              >
                <Select
                  options={[
                    { value: true, label: "Да" },
                    { value: false, label: "Нет" },
                  ]}
                  placeholder="—"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Редактирование"
                name="can_edit"
                valuePropName="checked"
              >
                <Select
                  options={[
                    { value: true, label: "Да" },
                    { value: false, label: "Нет" },
                  ]}
                  placeholder="—"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Удаление"
                name="can_delete"
                valuePropName="checked"
              >
                <Select
                  options={[
                    { value: true, label: "Да" },
                    { value: false, label: "Нет" },
                  ]}
                  placeholder="—"
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
        <Form form={reviewForm} layout="vertical" autoComplete="off">
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
