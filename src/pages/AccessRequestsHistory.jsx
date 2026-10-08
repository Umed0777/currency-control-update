import { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Space,
  Card,
  Typography,
  Tag,
  Empty,
  Spin,
  Input,
  Row,
  Col,
  Avatar,
} from "antd";

import {
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  UserOutlined,
  BankOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuth";

const { Title, Text } = Typography;

const redGradientText = {
  background: "linear-gradient(90deg, #ff4b4b, #e60026, #cf1322)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const redGradientBg = {
  background: "linear-gradient(135deg, #ff4b4b 0%, #e60026 100%)",
};

const STATUS_MAP = {
  approved: {
    label: "Одобрено",
    color: "success",
    icon: <CheckCircleOutlined />,
  },
  rejected: {
    label: "Отклонено",
    color: "error",
    icon: <CloseCircleOutlined />,
  },
  pending: { label: "В ожидании", color: "warning" },
};

const ROLE_MAP = {
  admin: "Администратор",
  compliance: "Комплаенс",
  operator: "Оператор",
  currency_control: "Валютный контроль",
  branch_head: "Глава филиала",
  pre_auth: "Ожидает одобрения",
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

const AccessRequestsHistory = () => {
  const navigate = useNavigate();
  const {
    accessRequestsHistory,
    loading,
    getAccessRequestsHistory,
  } = useAuthStore();

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    getAccessRequestsHistory();
  }, [getAccessRequestsHistory]);

  const safeItems = Array.isArray(accessRequestsHistory)
    ? accessRequestsHistory
    : [];

  const filtered = useMemo(() => {
    const q = String(searchValue || "").trim().toLowerCase();
    return safeItems.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      const applicant = item.applicant || {};
      const reviewer = item.reviewer || {};
      return [
        item.login,
        item.role,
        item.branch_id,
        applicant.login,
        applicant.first_name,
        applicant.last_name,
        applicant.email,
        reviewer.login,
        reviewer.first_name,
        reviewer.last_name,
        reviewer.email,
      ].some((v) =>
        String(v || "").toLowerCase().includes(q)
      );
    });
  }, [safeItems, searchValue, statusFilter]);

  const stats = useMemo(() => {
    const total = safeItems.length;
    const approved = safeItems.filter((i) => i.status === "approved").length;
    const rejected = safeItems.filter((i) => i.status === "rejected").length;
    return { total, approved, rejected };
  }, [safeItems]);

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (v) => (
        <Text strong style={{ color: "#e60026", fontFamily: "monospace" }}>
          #{v}
        </Text>
      ),
    },
    {
      title: "Заявитель",
      key: "applicant",
      width: 260,
      render: (_, record) => {
        const a = record.applicant || {};
        const fullName = [a.last_name, a.first_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        const login = a.login || record.login || "—";
        return (
          <Space size={10} align="center">
            <Avatar size={36} style={{ ...redGradientBg, fontWeight: 700 }}>
              {String(login).charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text strong style={{ fontSize: 13, display: "block" }}>
                {fullName || login}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, fontFamily: "monospace" }}>
                @{login}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: "Роль",
      dataIndex: "role",
      key: "role",
      width: 160,
      render: (v) => (
        <Tag color="red" style={{ borderRadius: 8 }}>
          {ROLE_MAP[v] || v || "—"}
        </Tag>
      ),
    },
    {
      title: "Филиал",
      dataIndex: "branch_id",
      key: "branch_id",
      width: 120,
      render: (v, record) => (
        <Space size={6}>
          <BankOutlined style={{ color: "#e60026", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>
            {record.branch_name || `#${v || "—"}`}
          </Text>
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (v) => {
        const info = STATUS_MAP[v] || { label: v || "—", color: "default" };
        return (
          <Tag
            color={info.color}
            style={{
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {info.icon}
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: "Проверил",
      key: "reviewer",
      width: 280,
      render: (_, record) => {
        const r = record.reviewer;
        const fallbackLogin = record.reviewed_by;
        if (!r && !fallbackLogin) return <Text type="secondary">—</Text>;
        const fullName = r
          ? [r.last_name, r.first_name].filter(Boolean).join(" ").trim()
          : "";
        const login = r?.login || fallbackLogin || "—";
        return (
          <Space size={10} align="center">
            <Avatar
              size={32}
              style={{ background: "#cf1322", fontWeight: 700 }}
            >
              {String(login).charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text strong style={{ fontSize: 13, display: "block" }}>
                {fullName || login}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, fontFamily: "monospace" }}>
                @{login}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: "Создан",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (v) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: "#e60026", fontSize: 11 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(v)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Обработан",
      dataIndex: "reviewed_at",
      key: "reviewed_at",
      width: 180,
      render: (v) => (
        <Space size={4}>
          <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 11 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(v)}
          </Text>
        </Space>
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
              // ...redGradientBg,
              background: '#8b0000',
              boxShadow: "0 10px 24px rgba(230,0,38,0.28)",
            }}
          >
            <HistoryOutlined style={{ fontSize: 18, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: '#8b0000' }}
            >
              История запросов на доступ
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Обработанные заявки: одобренные и отклонённые
            </Text>
          </div>
        </Space>

        <Button
          danger
          onClick={() => navigate(-1)}
          style={{ borderRadius: 12, height: 35 }}
        >
          Назад
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          {
            key: "total",
            label: "Всего обработано",
            value: stats.total,
            color: "#e60026",
            icon: <HistoryOutlined />,
          },
          {
            key: "approved",
            label: "Одобрено",
            value: stats.approved,
            color: "#52c41a",
            icon: <CheckCircleOutlined />,
          },
          {
            key: "rejected",
            label: "Отклонено",
            value: stats.rejected,
            color: "#cf1322",
            icon: <CloseCircleOutlined />,
          },
        ].map((s) => (
          <Col xs={24} sm={8} key={s.key}>
            <Card
              style={{
                borderRadius: 16,
                border: "none",
                boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
              }}
              bodyStyle={{ padding: 20 }}
            >
              <Space
                align="start"
                size={14}
                style={{ width: "100%", justifyContent: "space-between" }}
              >
                <div>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      fontWeight: 600,
                    }}
                  >
                    {s.label}
                  </Text>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      marginTop: 4,
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </div>
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${s.color}15`,
                    color: s.color,
                    fontSize: 20,
                  }}
                >
                  {s.icon}
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        style={{
          marginBottom: 20,
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        }}
        bodyStyle={{ padding: 20 }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Text style={{ display: "block", marginBottom: 8, fontSize: 14, color: '#8b0000' }}>
              Статус:
            </Text>
            <Space size={8} wrap>
              {[
                { key: "all", label: "Все", color: "#e60026" },
                { key: "approved", label: "Одобрено", color: "#52c41a" },
                { key: "rejected", label: "Отклонено", color: "#cf1322" },
              ].map((f) => {
                const isActive = statusFilter === f.key;
                return (
                  <div
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    style={{
                      cursor: "pointer",
                      padding: "6px 14px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      color: isActive ? "#fff" : f.color,
                      background: isActive ? f.color : `${f.color}15`,
                      border: `1px solid ${isActive ? f.color : `${f.color}44`}`,
                    }}
                  >
                    {f.label}
                  </div>
                );
              })}
            </Space>
          </Col>

          <Col xs={24} md={14}>
            <Text style={{ display: "block", marginBottom: 8, fontSize: 14, color: '#8b0000' }}>
              Поиск
            </Text>
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Логин, ФИО, email, роль..."
              allowClear
              prefix={<SearchOutlined style={{ color: '#8b0000', }} />}
              style={{ borderRadius: 10, height: 40, color: '#8b0000', }}
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
            <UserOutlined style={{ color: "#e60026", fontSize: 16 }} />
            <Text strong style={{ fontSize: 15 }}>
              Обработанные запросы
            </Text>
          </Space>
          <Tag
            color="red"
            style={{ borderRadius: 8, padding: "2px 12px", fontWeight: 600, color: '#8b0000', }}
          >
            Всего: {filtered.length}
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
              <Spin size="middle" style={{ color: "#e60026" }} />
            </div>
          ) : (
            <Table
              className="red-table"
              rowKey={(r) => String(r.id ?? Math.random())}
              loading={loading}
              columns={columns}
              dataSource={filtered}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                // showTotal: (total) => (
                //   <span style={{ color: "#e60026", fontWeight: 600 }}>
                //     Всего: {total}
                //   </span>
                // ),
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: "#999" }}>
                        {searchValue || statusFilter !== "all"
                          ? "Ничего не найдено"
                          : "История запросов пуста"}
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

export default AccessRequestsHistory;