import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Space,
  Card,
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
  Select,
  Descriptions,
  Badge,
  Divider,
} from "antd";

import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  DownloadOutlined,
  UndoOutlined,
  FileTextOutlined,
  DeleteOutlined,
  CloseOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  RollbackOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

import { useTrashStore } from "../store/useTrash";
import { useAuthStore } from "../store/useAuth";

const { Title, Text } = Typography;

const gradientText = {
  background: "linear-gradient(90deg, #ff4b4b, #d946ef, #8b5cf6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const CAN_VIEW_TRASH = [ "admin", "compliance", "currency_control"];

const ENTITY_TYPES = [
  { value: "", label: "Все типы" },
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

const getPersonName = (person) => {
  if (!person) return "";
  const surname = person.first_name || "";
  const name = person.last_name || "";
  return [surname, name].filter(Boolean).join(" ").trim();
};

const Trash = () => {
  const navigate = useNavigate();

  const {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    filters,
    detail,
    detailLoading,
    detailError,
    setFilter,
    resetFilters,
    fetchTrash,
    fetchDetail,
    clearDetail,
    downloadFile,
    openFile,
    restore,
    clearError,
  } = useTrashStore();

  const { role } = useAuthStore();
  const normalizedRole = String(role || "").toLowerCase();
  const canView = CAN_VIEW_TRASH.includes(normalizedRole);

  const [searchValue, setSearchValue] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [restoring, setRestoring] = useState(null);

  const safeItems = Array.isArray(items) ? items : [];

  useEffect(() => {
    if (canView) fetchTrash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSearch = () => {
    setFilter("search", searchValue);
    setFilter("page", 1);
    fetchTrash({ ...filters, search: searchValue, page: 1 });
  };

  const handleReset = () => {
    setSearchValue("");
    resetFilters();
    fetchTrash({ ...filters, search: "", entity_type: "", page: 1 });
  };

  const handleOpenDetail = async (record) => {
    setIsDetailOpen(true);
    try {
      await fetchDetail(record.entity_type, record.id);
    } catch {
      // ошибка уже в сторе
    }
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    clearDetail();
  };

  const handleRestore = async (record) => {
    setRestoring(record.id);
    try {
      await restore(record.entity_type, record.id);
      message.success("Документ восстановлен");
    } catch (e) {
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось восстановить"
      );
    } finally {
      setRestoring(null);
    }
  };

  const handleOpenFile = async (record) => {
    try {
      const entityType = record.entity_type;
      const id = record.id;
      const name = record.number || record.contract_number || "";
      const isPdf = String(record.document_path || "")
        .toLowerCase()
        .endsWith(".pdf");

      if (isPdf) {
        await openFile(entityType, id);
      } else {
        await downloadFile(entityType, id, name);
      }
    } catch (e) {
      console.error(e);
      message.error("Не удалось открыть файл");
    }
  };

  const columns = [
    {
      title: "Тип",
      dataIndex: "entity_type",
      key: "entity_type",
      width: 160,
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
      title: "Документ",
      dataIndex: "number",
      key: "number",
      width: 220,
      render: (v, record) => (
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
                whiteSpace: "nowrap",
              }}
            >
              {v || record.contract_number || "—"}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              ID: {record.id}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Клиент",
      dataIndex: "client_name",
      key: "client_name",
      width: 200,
      render: (v, record) => (
        <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v }}>
          {v || record.entity_name || "—"}
        </Text>
      ),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (v, record) => (
        <Text strong style={{ fontSize: 13 }}>
          {formatMoney(v, record.currency)}
        </Text>
      ),
    },
    {
      title: "Удалил",
      dataIndex: "deleted_by",
      key: "deleted_by",
      width: 260,
      render: (_, record) => {
        const name = getPersonName(record.deleter);
        const login = record.deleter?.login || record.deleted_by;
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12, fontWeight: 600 }}>
              {name || "—"}
            </Text>
            <Text style={{ fontSize: 11, color: "#d9363e" }}>
              {login || ""}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Дата удаления",
      dataIndex: "deleted_at",
      key: "deleted_at",
      width: 170,
      render: (v) => <Text type="secondary">{formatDateTime(v)}</Text>,
    },
    {
      title: "Действие",
      key: "actions",
      width: 180,
      align: "right",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Просмотреть детали">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: "#8b0000" }} />}
              onClick={() => handleOpenDetail(record)}
            />
          </Tooltip>

          <Tooltip title="Открыть/скачать файл">
            <Button
              type="text"
              icon={<DownloadOutlined style={{ color: "#8b0000" }} />}
              onClick={() => handleOpenFile(record)}
            />
          </Tooltip>

          <Tooltip title="Восстановить">
            <Button
              type="text"
              loading={restoring === record.id}
              icon={<RollbackOutlined style={{ color: "#8b0000" }} />}
              onClick={() => handleRestore(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (!canView) {
    return (
      <div style={{ padding: 40 }}>
        <Card
          style={{
            borderRadius: 18,
            border: "none",
            boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
            textAlign: "center",
            padding: "60px 20px",
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text strong style={{ fontSize: 16, display: "block" }}>
                  Доступ запрещён
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Раздел «журнал удаление» доступен только сотрудникам Комплаенс и
                  Валютного контроля.
                </Text>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

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
              background: '#8b0000',
              boxShadow: "0 10px 24px rgba(217,70,239,0.28)",
              flexShrink: 0,
            }}
          >
            <DeleteOutlined style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: '#8b0000' }}
            >
              Журнал удаление
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Удалённые документы: контракты, доп. соглашения, инвойсы, ГТД
            </Text>
          </div>
        </Space>

        <Space>
          <Badge
            // count={total}
            showZero
            overflowCount={9999}
            style={{ backgroundColor: "#ff4b4b" }}
          >
            <Button
            danger
              icon={<ReloadOutlined />}
              onClick={() => fetchTrash()}
              style={{ borderRadius: 12, height: 35, background: '#8b0000', color: '#fff', border: '1px solid #8b0000' }}
            >
              Обновить
            </Button>
          </Badge>
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
          <FilterOutlined style={{ color: "#8b0000", fontSize: 16, }} />
          <Text strong style={{ fontSize: 15, color: '#8b0000' }}>
            Фильтры
          </Text>
        </Space>

        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={6} lg={6}>
            <Text style={{ display: "block", marginBottom: 8, fontSize: 14, color: '#8b0000' }}>
              Тип документа
            </Text>
            <Select
              value={filters.entity_type}
              onChange={(v) => {
                setFilter("entity_type", v);
                setFilter("page", 1);
                fetchTrash({ ...filters, entity_type: v, page: 1 });
              }}
              options={ENTITY_TYPES}
              style={{ width: "100%", height: 35, border: '1px solid #8b0000' }}
            />
          </Col>

          <Col xs={24} md={12} lg={13}>
            <Text style={{ display: "block", marginBottom: 8, fontSize: 14, color: '#8b0000' }}>
              Поиск по номеру или клиенту
            </Text>
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Введите номер документа или клиента"
              allowClear
              onPressEnter={handleSearch}
              style={{ borderRadius: 10, height: 35 }}
            />
          </Col>

          <Col xs={24} md={6} lg={5}>
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
                  background: '#8b0000',
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
            <DeleteOutlined style={{ color: "#8b0000", fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: '#8b0000' }}>
              Удалённые документы
            </Text>
          </Space>
          <Tag
            color="red"
            style={{
              borderRadius: 8,
              padding: "2px 12px",
              fontWeight: 600,
              fontSize: 13,
              color: '#8b0000',
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
              rowKey={(r) => `${r.entity_type}-${r.id}`}
              loading={loading}
              columns={columns}
              dataSource={safeItems}
              scroll={{ x: 1300 }}
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
                  fetchTrash({ ...filters, page: p });
                },
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: "#999" }}>
                        В корзине нет документов
                      </span>
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
            <span style={{ fontWeight: 700, color: '#8b0000' }}>
              Детали удалённого документа
            </span>
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
        width={820}
        style={{ top: 60 }}
        destroyOnHidden
        maskClosable
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
              title={
                <Space size={8}>
                  <Tag
                    color={
                      ENTITY_TYPE_COLORS[detail.entity_type] || "default"
                    }
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    {ENTITY_TYPE_LABELS[detail.entity_type] ||
                      detail.entity_type}
                  </Tag>
                  <Text strong style={{ fontFamily: "monospace" }}>
                    {detail.number ||
                      detail.contract_number ||
                      `ID ${detail.id}`}
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
                width: 160,
              }}
              contentStyle={{ fontSize: 13 }}
            >
              <Descriptions.Item label="ID">
                {detail.id ?? "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Тип">
                {ENTITY_TYPE_LABELS[detail.entity_type] ||
                  detail.entity_type ||
                  "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Номер">
                {detail.number || detail.contract_number || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Номер контракта">
                {detail.contract_number || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Клиент">
                {detail.client_name || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="ID клиента">
                {detail.client_id ?? "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Сумма">
                <Space size={4}>
                  <DollarOutlined style={{ color: "#8b0000" }} />
                  {formatMoney(detail.amount, detail.currency)}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Валюта">
                {detail.currency || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Дата документа">
                <Space size={4}>
                  <CalendarOutlined style={{ color: "#8b0000" }} />
                  {formatDate(detail.document_date)}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Сущность">
                {detail.entity_name || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Путь к файлу" span={2}>
                {detail.document_path ? (
                  <Text
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#8b0000",
                    }}
                  >
                    {detail.document_path}
                  </Text>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: "16px 0" }} />

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card
                  size="small"
                  title={
                    <Space size={8}>
                      <UserOutlined style={{ color: "#8b0000" }} />
                      <Text strong style={{ fontSize: 13 }}>
                        Создал
                      </Text>
                    </Space>
                  }
                  style={{ borderRadius: 12 }}
                >
                  <Space direction="vertical" size={4}>
                    <Text strong style={{ fontSize: 13 }}>
                      {getPersonName(detail.creator) || "—"}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Логин:{" "}
                      <Text style={{ color: "#d9363e" }}>
                        {detail.creator?.login || detail.created_by || "—"}
                      </Text>
                    </Text>
                    {detail.creator?.email && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Email:{" "}
                        <Text style={{ color: "#ff4b4b" }}>
                          {detail.creator.email}
                        </Text>
                      </Text>
                    )}
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card
                  size="small"
                  title={
                    <Space size={8}>
                      <DeleteOutlined style={{ color: "#cf1322" }} />
                      <Text strong style={{ fontSize: 13 }}>
                        Удалил
                      </Text>
                    </Space>
                  }
                  style={{ borderRadius: 12 }}
                >
                  <Space direction="vertical" size={4}>
                    <Text strong style={{ fontSize: 13 }}>
                      {getPersonName(detail.deleter) || "—"}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Логин:{" "}
                      <Text style={{ color: "#d9363e" }}>
                        {detail.deleter?.login || detail.deleted_by || "—"}
                      </Text>
                    </Text>
                    {detail.deleter?.email && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Email:{" "}
                        <Text style={{ color: "#ff4b4b" }}>
                          {detail.deleter.email}
                        </Text>
                      </Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Дата удаления: {formatDateTime(detail.deleted_at)}
                    </Text>
                  </Space>
                </Card>
              </Col>
            </Row>

            <Divider style={{ margin: "16px 0" }} />

            <Space size={10} wrap>
              <Button
                type="primary"
                icon={<UndoOutlined />}
                loading={restoring === detail.id}
                onClick={async () => {
                  await handleRestore(detail);
                  handleCloseDetail();
                }}
                style={{
                  borderRadius: 10,
                  background: "#8b0000",
                  border: "none",
                  fontWeight: 600,
                }}
              >
                Восстановить
              </Button>

              <Button
              danger
                icon={<DownloadOutlined />}
                onClick={() => handleOpenFile(detail)}
                style={{ borderRadius: 10 }}
              >
                Открыть / скачать файл
              </Button>
            </Space>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Trash;