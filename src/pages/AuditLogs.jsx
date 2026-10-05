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
  Select,
  DatePicker,
  Avatar,
} from "antd";

import {
  AuditOutlined,
  SearchOutlined,
  ReloadOutlined,
  BankOutlined,
  UserOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  LoginOutlined,
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useAuditStore } from "../store/useAuditStore";
import { useAuthStore } from "../store/useAuth";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const gradientText = {
  background: "linear-gradient(90deg, #ff4b4b, #d946ef, #8b5cf6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const ACTION_MAP = {
  LOGIN: { label: "Вход", color: "green", icon: <LoginOutlined /> },
  LOGOUT: { label: "Выход", color: "default", icon: <LoginOutlined /> },
  CREATE: { label: "Создание", color: "blue", icon: <PlusCircleOutlined /> },
  UPDATE: { label: "Обновление", color: "gold", icon: <EditOutlined /> },
  DELETE: { label: "Удаление", color: "red", icon: <DeleteOutlined /> },
};

const ENTITY_MAP = {
  contract: "Контракт",
  invoice: "Инвойс",
  company: "Компания",
  branch: "Филиал",
  additional_agreement: "Доп. соглашение",
  gtd: "ГТД",
  payment_order: "Платёжное поручение",
  user: "Пользователь",
};

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
    second: "2-digit",
  });
};

export const AuditLogs = () => {
  const navigate = useNavigate();

  const {
    logs,
    total,
    limit,
    offset,
    filters,
    isLoading,
    error,
    fetchAuditLogs,
    setFilters,
    resetFilters,
    setPagination,
    clearError,
  } = useAuditStore();

  const { role } = useAuthStore();

  const [localFilters, setLocalFilters] = useState({
    user_login: "",
    action: undefined,
    entity: undefined,
    branch_id: "",
  });

  const [dateRange, setDateRange] = useState(null);

  const safeLogs = Array.isArray(logs) ? logs : [];

  useEffect(() => {
    fetchAuditLogs({ offset: 0 });
  }, [fetchAuditLogs]);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError?.();
    }
  }, [error, clearError]);

  const handleSearch = () => {
    const from = dateRange?.[0] ? dateRange[0].format("YYYY-MM-DD") : null;
    const to = dateRange?.[1] ? dateRange[1].format("YYYY-MM-DD") : null;

    setFilters({
      ...localFilters,
      from_date: from,
      to_date: to,
    });
    setPagination(limit, 0);
    fetchAuditLogs({
      ...localFilters,
      from_date: from,
      to_date: to,
      offset: 0,
    });
  };

  const handleReset = () => {
    setLocalFilters({
      user_login: "",
      action: undefined,
      entity: undefined,
      branch_id: "",
    });
    setDateRange(null);
    resetFilters();
    setPagination(50, 0);
    fetchAuditLogs({
      user_login: "",
      action: "",
      entity: "",
      branch_id: "",
      from_date: "",
      to_date: "",
      offset: 0,
    });
  };

  const handleTableChange = (pagination) => {
    const newOffset = (pagination.current - 1) * pagination.pageSize;
    setPagination(pagination.pageSize, newOffset);
    fetchAuditLogs({
      limit: pagination.pageSize,
      offset: newOffset,
    });
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      align: "center",
      render: (v) => <Text type="secondary">{v ?? "—"}</Text>,
    },
    {
      title: "Дата",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (v) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateTime(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Действие",
      dataIndex: "action",
      key: "action",
      width: 150,
      render: (v) => {
        const info = ACTION_MAP[v] || {
          label: v || "—",
          color: "default",
          icon: <FileTextOutlined />,
        };
        return (
          <Tag
            icon={info.icon}
            color={info.color}
            style={{
              borderRadius: 8,
              fontWeight: 500,
              padding: "2px 10px",
            }}
          >
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: "Сущность",
      dataIndex: "entity",
      key: "entity",
      width: 180,
      render: (v, record) => (
        <Space direction="vertical" size={0}>
          <Tag color="purple" style={{ borderRadius: 8 }}>
            {ENTITY_MAP[v] || v || "—"}
          </Tag>
          {record.entity_id !== undefined && record.entity_id !== null && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              ID: {record.entity_id}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Пользователь",
      dataIndex: "user_login",
      key: "user_login",
      width: 280,
      render: (v, record) => {
        const user = record.user || {};
        const fullName = [user.first_name, user.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        const email = user.email || record.user_email;
        const login = user.login || v || record.user_login;

        if (!fullName && !login && !email) {
          return <Text type="secondary">—</Text>;
        }

        return (
          <Space size={6}>
            <Avatar
              size={20}
              style={{
                background: "linear-gradient(135deg, #ff4b4b, #d946ef)",
                fontSize: 10,
              }}
            >
              {String(login || "?").charAt(0).toUpperCase()}
            </Avatar>
            <Text style={{ fontSize: 12 }}>
              {fullName && <Text strong>{fullName}</Text>}
              {login && (
                <Text
                  style={{
                    color: "#d9363e",
                    fontFamily: "monospace",
                    fontWeight: 500,
                  }}
                >
                  {fullName ? " • " : ""}
                  {login}
                </Text>
              )}
              {email && (
                <Text style={{ color: "#ff4b4b", fontWeight: 600 }}>
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
      title: "Роль",
      dataIndex: "role",
      key: "role",
      width: 140,
      render: (v) => (
        <Tag color="blue" style={{ borderRadius: 8 }}>
          {v || "—"}
        </Tag>
      ),
    },
    {
      title: "Филиал",
      dataIndex: "branch_id",
      key: "branch_id",
      width: 120,
      align: "center",
      render: (v) => (
        <Space size={4}>
          <BankOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{v ?? "—"}</Text>
        </Space>
      ),
    },
    {
      title: "IP-адрес",
      dataIndex: "ip_address",
      key: "ip_address",
      width: 150,
      render: (v) => (
        <Space size={4}>
          <GlobalOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 12, fontFamily: "monospace" }}>
            {v || "—"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Детали",
      dataIndex: "details",
      key: "details",
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Text style={{ fontSize: 12 }}>{v || "—"}</Text>
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      {/* ==== Заголовок ==== */}
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
            <AuditOutlined style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: '#8b0000' }}
            >
              Журнал аудита
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              История действий пользователей системы
            </Text>
          </div>
        </Space>

        <Space>
          <Button
            danger
            icon={<ReloadOutlined />}
            onClick={() => fetchAuditLogs()}
            style={{ borderRadius: 12, height: 35, background: '#8b0000', color: '#fff', border: '1px solid #8b0000' }}
          >
            Обновить
          </Button>
          <Button
            danger
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ borderRadius: 12, height: 36 }}
          >
            Назад
          </Button>
        </Space>
      </div>
      <Card
        style={{
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          marginBottom: 20,
        }}
        bodyStyle={{ padding: 20 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={6}>
            <Text strong style={{ fontSize: 13, color: '#8b0000' }}>
              Логин пользователя
            </Text>
            <Input
              placeholder="Введите логин"
              style={{ borderRadius: 10, marginTop: 6 }}
              value={localFilters.user_login}
              onChange={(e) =>
                setLocalFilters((s) => ({
                  ...s,
                  user_login: e.target.value,
                }))
              }
              prefix={<UserOutlined style={{ color: '#8b0000' }} />}
              allowClear
            />
          </Col>

          <Col xs={24} md={12} lg={6}>
            <Text strong style={{ fontSize: 13, color: '#8b0000' }}>
              Действие
            </Text>
            <Select
              placeholder="Выберите действие"
              style={{ width: "100%", borderRadius: 10, marginTop: 6, border:  ' 1px solid #8b0000' }}
              value={localFilters.action}
              onChange={(v) =>
                setLocalFilters((s) => ({ ...s, action: v }))
              }
              allowClear
              options={[
                { value: "LOGIN", label: "Вход" },
                { value: "LOGOUT", label: "Выход" },
                { value: "CREATE", label: "Создание" },
                { value: "UPDATE", label: "Обновление" },
                { value: "DELETE", label: "Удаление" },
              ]}
            />
          </Col>

          <Col xs={24} md={12} lg={6}>
            <Text strong style={{ fontSize: 13, color: '#8b0000', }}>
              Сущность
            </Text>
            <Select
              placeholder="Выберите сущность"
              style={{ width: "100%", borderRadius: 10, marginTop: 6, border: '1px solid #8b0000' }}
              value={localFilters.entity}
              onChange={(v) =>
                setLocalFilters((s) => ({ ...s, entity: v }))
              }
              allowClear
              options={Object.entries(ENTITY_MAP).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Col>

          <Col xs={24} md={12} lg={6}>
            <Text strong style={{ fontSize: 13, color: '#8b0000' }}>
              Филиал (ID)
            </Text>
            <Input
              placeholder="ID филиала"
              style={{ borderRadius: 10, marginTop: 6 }}
              value={localFilters.branch_id}
              onChange={(e) =>
                setLocalFilters((s) => ({
                  ...s,
                  branch_id: e.target.value,
                }))
              }
              prefix={<BankOutlined style={{ color: '#8b0000' }} />}
              allowClear
            />
          </Col>

          <Col xs={24} md={12} lg={12}>
            <Text strong style={{ fontSize: 13, color: '#8b0000' }}>
              Диапазон дат
            </Text>
            <RangePicker
              style={{ width: "100%", borderRadius: 10, marginTop: 6 }}
              value={dateRange}
              onChange={(v) => setDateRange(v)}
              format="YYYY-MM-DD"
              placeholder={["Дата начала", "Дата окончания"]}
            />
          </Col>

          <Col xs={24} md={12} lg={4}>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                marginTop: 24,
              }}
            >
              <Button
                danger
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                style={{
                  borderRadius: 10,
                  height: 35,
                  // background:
                  //   "linear-gradient(90deg, #ff4b4b 0%, #d946ef 100%)",
                  background: '#8b0000',
                  border: "none",
                  boxShadow: "0 6px 16px rgba(217,70,239,0.35)",
                  fontWeight: 600,
                }}
              >
                Найти
              </Button>
               <Button
               danger
                icon={<ReloadOutlined />}
                onClick={handleReset}
                style={{ borderRadius: 10, height: 34 }}
              >
                Сбросить
              </Button>
            </div>
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
            <AuditOutlined style={{ color: "#e60026", fontSize: 16 }} />
            <Text strong style={{ fontSize: 15 }}>
              Список записей
            </Text>
          </Space>
          <Tag
            color="red"
            style={{
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
          {isLoading && safeLogs.length === 0 ? (
            <div
              style={{
                minHeight: 300,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Spin size="middle" style={{ color: "#f00" }} />
            </div>
          ) : (
            <Table
              className="red-table"
              rowKey={(r) => String(r.id ?? Math.random())}
              loading={isLoading}
              columns={columns}
              dataSource={safeLogs}
              scroll={{ x: "max-content" }}
              pagination={{
                current: Math.floor(offset / limit) + 1,
                pageSize: limit,
                total,
                showSizeChanger: false,
                pageSizeOptions: ["25", "50", "100"],
                // showTotal: (t) => (
                //   <span
                //     style={{
                //       color: "#ff4d4f",
                //       fontWeight: 600,
                //       position: "relative",
                //       top: 2,
                //     }}
                //   >
                //     Всего записей: {t}
                //   </span>
                // ),
                style: { marginTop: 16 },
              }}
              onChange={handleTableChange}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: "#999" }}>
                        Записей не найдено
                      </span>
                    }
                  />
                ),
              }}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default AuditLogs;