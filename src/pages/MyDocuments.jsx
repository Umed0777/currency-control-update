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
  Select,
  Descriptions,
  Badge,
  Divider,
  Avatar,
} from "antd";

import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  CloseOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  ArrowLeftOutlined,
  FileDoneOutlined,
  BankOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

import { useMyDocumentsStore } from "../store/useMyDocuments";
import { useAuthStore } from "../store/useAuth";

const { Title, Text } = Typography;

const gradientText = {
  background: "linear-gradient(90deg, #ff4b4b, #d946ef, #8b5cf6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

// ==== Справочники ====
const ENTITY_TYPES = [
  { value: "all", label: "Все типы" },
  { value: "contract", label: "Контракты" },
  { value: "additional_agreement", label: "Доп. соглашения" },
  { value: "invoice", label: "Инвойсы" },
  { value: "gtd", label: "ГТД" },
];

const ENTITY_TYPE_LABELS = {
  contract: "Контракт",
  additional_agreement: "Доп. соглашение",
  invoice: "Инвойс",
  gtd: "ГТД",
};

const ENTITY_TYPE_COLORS = {
  contract: "red",
  additional_agreement: "purple",
  invoice: "blue",
  gtd: "green",
};

const STATUS_OPTIONS = [
  { value: "all", label: "Все статусы" },
  { value: "pending_currency_control", label: "На валютном контроле" },
  { value: "pending_compliance", label: "На комплаенсе" },
  { value: "revision_required", label: "На доработке" },
  { value: "approved", label: "Одобрено" },
  { value: "rejected", label: "Отклонено" },
];

const STATUS_MAP = {
  pending_currency_control: {
    label: "На валютном контроле",
    color: "orange",
    icon: <SyncOutlined spin />,
  },
  pending_compliance: {
    label: "На комплаенсе",
    color: "gold",
    icon: <ClockCircleOutlined />,
  },
  revision_required: {
    label: "На доработке",
    color: "volcano",
    icon: <ExclamationCircleOutlined />,
  },
  approved: {
    label: "Одобрено",
    color: "green",
    icon: <CheckOutlined />,
  },
  rejected: {
    label: "Отклонено",
    color: "red",
    icon: <CloseCircleOutlined />,
  },
};

const SCOPE_OPTIONS = [
  { value: "mine", label: "Только мои" },
  { value: "all", label: "Все документы" },
];

// ==== Хелперы ====
const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ru-RU", {
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

const getPersonName = (person) => {
  if (!person) return "";
  const surname = person.first_name || "";
  const name = person.last_name || "";
  return [surname, name].filter(Boolean).join(" ").trim();
};

const MyDocuments = () => {
  const navigate = useNavigate();

  const {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    filters,
    setFilter,
    resetFilters,
    fetchMyDocuments,
    clearError,
  } = useMyDocumentsStore();

  const { role } = useAuthStore();

  const [searchValue, setSearchValue] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState(null);

  const safeItems = Array.isArray(items) ? items : [];

  useEffect(() => {
    fetchMyDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSearch = () => {
    setFilter("search", searchValue);
    setFilter("page", 1);
    fetchMyDocuments({ ...filters, search: searchValue, page: 1 });
  };

  const handleReset = () => {
    setSearchValue("");
    resetFilters();
    fetchMyDocuments({
      scope: "mine",
      status: "all",
      entity_type: "all",
      page: 1,
      page_size: 20,
    });
  };

  const handleOpenDetail = (record) => {
    setDetailDoc(record);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setDetailDoc(null);
  };

  const columns = [
    {
      title: "Документ",
      dataIndex: "document_number",
      key: "document_number",
      width: 230,
      render: (v, record) => (
        <Space size={10} align="center">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "#f9f0ff",
              border: "1px solid #d3adf7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#722ed1",
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
              {v || "—"}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              ID: {record.entity_id}
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
      render: (v) => (
        <Tag
          color={ENTITY_TYPE_COLORS[v] || "default"}
          style={{ borderRadius: 8, fontWeight: 600, fontSize: 12 }}
        >
          {ENTITY_TYPE_LABELS[v] || v || "—"}
        </Tag>
      ),
    },
    {
      title: "Предмет",
      dataIndex: "subject",
      key: "subject",
      width: 220,
      render: (v) => (
        <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Название компании",
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
      dataIndex: "amount",
      key: "amount",
      width: 240,
      render: (v, record) => (
        <Text strong style={{ fontSize: 13, color: "#d946ef" }}>
          {formatMoney(v, record.currency)}
        </Text>
      ),
    },
    {
      title: "Филиал",
      dataIndex: "branch_name",
      key: "branch_name",
      width: 180,
      render: (v) => (
        <Space size={6}>
          <BankOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: v }}>
            {v || "—"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "approval_status",
      key: "approval_status",
      width: 190,
      render: (v) => {
        const info = STATUS_MAP[v] || {
          label: v || "—",
          color: "default",
          icon: null,
        };
        return (
          <Tag
            color={info.color}
            icon={info.icon}
            style={{
              borderRadius: 999,
              fontWeight: 600,
              padding: "2px 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: "Дата",
      dataIndex: "document_date",
      key: "document_date",
      width: 800,
      align: "center",
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDate(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Создан",
      dataIndex: "created_at",
      key: "created_at",
      width: 800,
      align: "center",
      render: (v) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(v)}
        </Text>
      ),
    },
    {
      title: "Действие",
      key: "actions",
      width: 340,
      align: "center",
      //   fixed: "right",
      render: (_, record) => (
        <Tooltip title="Подробнее">
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: "#8b0000" }} />}
            onClick={() => handleOpenDetail(record)}
          />
        </Tooltip>
      ),
    },
  ];

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
              // background:
              //   "linear-gradient(135deg, #ff4b4b 0%, #d946ef 50%, #8b5cf6 100%)",
              background: "#8b0000",
              boxShadow: "0 10px 24px rgba(217,70,239,0.28)",
              flexShrink: 0,
            }}
          >
            <FileDoneOutlined style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: "#8b0000" }}
            >
              Мои документы
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Контракты, инвойсы, ГТД, доп. соглашения — все статусы
            </Text>
          </div>
        </Space>

        <Space>
          <Button
            danger
            icon={<ReloadOutlined />}
            onClick={() => fetchMyDocuments()}
            style={{
              borderRadius: 12,
              background: "#8b0000",
              height: 35,
              color: "#fff",
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
          <Text strong style={{ fontSize: 15, color: "#8b0000" }}>
            Фильтры
          </Text>
        </Space>

        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={6} lg={5}>
            <Text
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 14,
                color: "#8b0000",
              }}
            >
              Область
            </Text>
            <Select
              value={filters.scope}
              onChange={(v) => {
                setFilter("scope", v);
                setFilter("page", 1);
                fetchMyDocuments({ ...filters, scope: v, page: 1 });
              }}
              options={SCOPE_OPTIONS}
              style={{ width: "100%", height: 35, border: "1px solid #8b0000" }}
            />
          </Col>

          <Col xs={24} md={6} lg={5}>
            <Text
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 14,
                color: "#8b0000",
              }}
            >
              Статус
            </Text>
            <Select
              value={filters.status}
              onChange={(v) => {
                setFilter("status", v);
                setFilter("page", 1);
                fetchMyDocuments({ ...filters, status: v, page: 1 });
              }}
              options={STATUS_OPTIONS}
              style={{ width: "100%", height: 35, border: "1px solid #8b0000" }}
            />
          </Col>

          <Col xs={24} md={6} lg={5}>
            <Text
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 14,
                color: "#8b0000",
              }}
            >
              Тип документа
            </Text>
            <Select
              value={filters.entity_type}
              onChange={(v) => {
                setFilter("entity_type", v);
                setFilter("page", 1);
                fetchMyDocuments({ ...filters, entity_type: v, page: 1 });
              }}
              options={ENTITY_TYPES}
              style={{ width: "100%", height: 35, border: "1px solid #8b0000" }}
            />
          </Col>

          <Col xs={24} md={6} lg={4}>
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
                  // background: "linear-gradient(90deg, #ff4b4b, #d946ef)",
                  background: "#8b0000",
                  border: "none",
                  boxShadow: "0 6px 16px rgba(217,70,239,0.28)",
                  fontWeight: 600,
                }}
              >
                Поиск
              </Button>
              <Button
                danger
                onClick={handleReset}
                style={{
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
              "linear-gradient(90deg, #fff5f5 0%, #ffffff 60%, #faf5ff 100%)",
            borderBottom: "1px solid rgba(139,0,0,0.06)",
          }}
        >
          <Space size={10}>
            <FileTextOutlined style={{ color: "#8b0000", fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: "#8b0000" }}>
              Мои документы
            </Text>
          </Space>
          <Tag
            color="red"
            style={{
              color: "#8b0000",
              borderRadius: 8,
              padding: "2px 12px",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Всего: {total}
          </Tag>
        </div>

        <div style={{ padding: 20 }}>
          {loading && safeItems.length === 0 ? (
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
                `${r.entity_type}-${r.entity_id}-${r.document_number}`
              }
              loading={loading}
              columns={columns}
              dataSource={safeItems}
              scroll={{ x: 1600 }}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                showSizeChanger: false,
                // showTotal: (t) => (
                //   <span style={{ color: "#ff4d4f", fontWeight: 600 }}>
                //     Всего: {t}
                //   </span>
                // ),
                onChange: (p) => {
                  setFilter("page", p);
                  fetchMyDocuments({ ...filters, page: p });
                },
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: "#999" }}>Документов нет</span>
                    }
                  />
                ),
              }}
            />
          )}
        </div>
      </Card>
      <Modal
        title={
          <Space size={10}>
            <FileTextOutlined style={{ color: "#8b0000", fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: "#8b0000" }}>
              Детали документа
            </span>
            {detailDoc?.approval_status && (
              <Tag
                color={
                  STATUS_MAP[detailDoc.approval_status]?.color || "default"
                }
                style={{
                  borderRadius: 999,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {STATUS_MAP[detailDoc.approval_status]?.label ||
                  detailDoc.approval_status}
              </Tag>
            )}
          </Space>
        }
        open={isDetailOpen}
        onCancel={handleCloseDetail}
        footer={[
          <Button
            key="close"
            danger
            icon={<CloseOutlined />}
            onClick={handleCloseDetail}
            style={{ borderRadius: 10 }}
          >
            Закрыть
          </Button>,
        ]}
        width={900}
        style={{ top: 60 }}
        destroyOnHidden
        maskClosable
      >
        {!detailDoc ? (
          <Empty description="Нет данных" />
        ) : (
          <>
            <Descriptions
              title={
                <Space size={8}>
                  <Tag
                    color={
                      ENTITY_TYPE_COLORS[detailDoc.entity_type] || "default"
                    }
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    {ENTITY_TYPE_LABELS[detailDoc.entity_type] ||
                      detailDoc.entity_type}
                  </Tag>
                  <Text strong style={{ fontFamily: "monospace" }}>
                    {detailDoc.document_number || `ID ${detailDoc.entity_id}`}
                  </Text>
                </Space>
              }
              bordered
              column={2}
              size="small"
              labelStyle={{
                background: "#fafafa",
                fontWeight: 600,
                fontSize: 12,
                width: 170,
              }}
              contentStyle={{ fontSize: 13 }}
            >
              <Descriptions.Item label="ID записи">
                {detailDoc.entity_id ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Филиал">
                {detailDoc.branch_name || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Номер документа">
                {detailDoc.document_number || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Предмет">
                {detailDoc.subject || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Название компании">
                {detailDoc.counterparty_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Сумма">
                <Space size={4}>
                  <DollarOutlined style={{ color: "#8b5cf6" }} />
                  {formatMoney(detailDoc.amount, detailDoc.currency)}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Дата документа">
                <Space size={4}>
                  <CalendarOutlined style={{ color: "#8b5cf6" }} />
                  {formatDate(detailDoc.document_date)}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Создан">
                {formatDateTime(detailDoc.created_at)}
              </Descriptions.Item>

              <Descriptions.Item label="Путь к файлу" span={2}>
                {detailDoc.document_path ? (
                  <Text
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#8b5cf6",
                    }}
                  >
                    {detailDoc.document_path}
                  </Text>
                ) : (
                  "—"
                )}
              </Descriptions.Item>

              {detailDoc.rejection_reason && (
                <Descriptions.Item label="Причина отклонения" span={2}>
                  <Text style={{ color: "#cf1322" }}>
                    {detailDoc.rejection_reason}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider style={{ margin: "16px 0" }}>Создатель</Divider>

            <Card size="small" style={{ borderRadius: 12 }}>
              <Space size={10} align="center">
                <Avatar
                  size={36}
                  style={{
                    background: "linear-gradient(135deg, #ff4b4b, #d946ef)",
                  }}
                >
                  {String(
                    detailDoc.creator?.login ||
                      detailDoc.creator?.first_name ||
                      "?",
                  )
                    .charAt(0)
                    .toUpperCase()}
                </Avatar>
                <Space direction="vertical" size={0}>
                  <Text strong style={{ fontSize: 13 }}>
                    {getPersonName(detailDoc.creator) || "—"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#d9363e" }}>
                    {detailDoc.creator?.login || "—"}
                  </Text>
                  {detailDoc.creator?.email && (
                    <Text style={{ fontSize: 12, color: "#ff4b4b" }}>
                      {detailDoc.creator.email}
                    </Text>
                  )}
                </Space>
              </Space>
            </Card>
            {(detailDoc.compliance_decision ||
              detailDoc.compliance_comment ||
              detailDoc.compliance_reviewer) && (
              <>
                <Divider style={{ margin: "16px 0" }}>Комплаенс</Divider>
                <Card
                  size="small"
                  style={{
                    borderRadius: 12,
                    background:
                      detailDoc.compliance_decision === "approved"
                        ? "#f6ffed"
                        : detailDoc.compliance_decision === "rejected"
                          ? "#fff1f0"
                          : "#fafafa",
                  }}
                >
                  <Space
                    direction="vertical"
                    size={6}
                    style={{ width: "100%" }}
                  >
                    <Space size={6}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Решение:
                      </Text>
                      <Tag
                        color={
                          detailDoc.compliance_decision === "approved"
                            ? "green"
                            : detailDoc.compliance_decision === "rejected"
                              ? "red"
                              : "gold"
                        }
                        style={{ borderRadius: 6, margin: 0 }}
                      >
                        {detailDoc.compliance_decision || "—"}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDateTime(detailDoc.compliance_reviewed_at)}
                      </Text>
                    </Space>
                    {detailDoc.compliance_comment && (
                      <Text style={{ fontSize: 12 }}>
                        «{detailDoc.compliance_comment}»
                      </Text>
                    )}
                    {detailDoc.compliance_reviewer && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Рассмотрел:{" "}
                        <Text style={{ color: "#8b5cf6" }}>
                          {getPersonName(detailDoc.compliance_reviewer) ||
                            detailDoc.compliance_reviewer.login}
                        </Text>
                      </Text>
                    )}
                  </Space>
                </Card>
              </>
            )}
            {(detailDoc.currency_control_decision ||
              detailDoc.currency_control_comment ||
              detailDoc.currency_control_reviewer) && (
              <>
                <Divider style={{ margin: "16px 0" }}>
                  Валютный контроль
                </Divider>
                <Card
                  size="small"
                  style={{
                    borderRadius: 12,
                    background:
                      detailDoc.currency_control_decision === "approved"
                        ? "#f6ffed"
                        : detailDoc.currency_control_decision === "rejected"
                          ? "#fff1f0"
                          : "#fafafa",
                  }}
                >
                  <Space
                    direction="vertical"
                    size={6}
                    style={{ width: "100%" }}
                  >
                    <Space size={6}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Решение:
                      </Text>
                      <Tag
                        color={
                          detailDoc.currency_control_decision === "approved"
                            ? "green"
                            : detailDoc.currency_control_decision === "rejected"
                              ? "red"
                              : "gold"
                        }
                        style={{ borderRadius: 6, margin: 0 }}
                      >
                        {detailDoc.currency_control_decision || "—"}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDateTime(detailDoc.currency_control_reviewed_at)}
                      </Text>
                    </Space>
                    {detailDoc.currency_control_comment && (
                      <Text style={{ fontSize: 12 }}>
                        «{detailDoc.currency_control_comment}»
                      </Text>
                    )}
                    {detailDoc.currency_control_reviewer && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Рассмотрел:{" "}
                        <Text style={{ color: "#8b5cf6" }}>
                          {getPersonName(detailDoc.currency_control_reviewer) ||
                            detailDoc.currency_control_reviewer.login}
                        </Text>
                      </Text>
                    )}
                  </Space>
                </Card>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default MyDocuments;
