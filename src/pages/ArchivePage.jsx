import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Badge,
  Popconfirm,
} from "antd";

import {
  ReloadOutlined,
  UndoOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  BankOutlined,
  CalendarOutlined,
  DollarOutlined,
  UserOutlined,
  InboxOutlined,
} from "@ant-design/icons";

import { useArchiveStore } from "../store/useArchiveStore";
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

// Кто может восстанавливать (по Swagger: Валютный контроль, Комплаенс, Администратор)
const CAN_RESTORE = ["admin", "compliance", "currency_control"];

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

const formatDate = (v) => {
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

const getPersonName = (person) => {
  if (!person) return "";
  const surname = person.first_name || "";
  const name = person.last_name || "";
  return [surname, name].filter(Boolean).join(" ").trim();
};

const ArchivePage = () => {
  const navigate = useNavigate();
  const { id: branchId } = useParams();

  const { role } = useAuthStore();
  const normalizedRole = String(role || "").toLowerCase();
  const canRestore = CAN_RESTORE.includes(normalizedRole);

  const {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    restoring,
    fetchArchive,
    restoreContract,
    clearError,
  } = useArchiveStore();

  useEffect(() => {
    if (branchId) {
      fetchArchive(branchId, 1, 20).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleRestore = async (record) => {
    try {
      await restoreContract(branchId, record.company_id, record.id);
      message.success("Контракт восстановлен");
    } catch (e) {
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось восстановить контракт"
      );
    }
  };

  const columns = [
    {
      title: "№ контракта",
      dataIndex: "contract_number",
      key: "contract_number",
      width: 180,
      render: (v) => (
        <Text strong style={{ fontFamily: "monospace", fontSize: 13 }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Клиент",
      key: "client",
      width: 240,
      render: (_, record) => (
        <Space size={6}>
          <UserOutlined style={{ color: "#e60026", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: true }}>
            {record.client_name || record.company_name || "—"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Дата контракта",
      dataIndex: "contract_date",
      key: "contract_date",
      width: 150,
      render: (v) => (
        <Space size={6}>
          <CalendarOutlined style={{ color: "#e60026", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDate(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Дата окончания",
      dataIndex: "contract_end_date",
      key: "contract_end_date",
      width: 150,
      render: (v) => (
        <Space size={6}>
          <CalendarOutlined style={{ color: "#cf1322", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDate(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Сумма",
      key: "amount",
      width: 160,
      render: (_, record) => (
        <Text strong style={{ color: "#e60026", fontSize: 13 }}>
          {formatMoney(record.amount, record.contract_currency)}
        </Text>
      ),
    },
    {
      title: "Архивирован",
      dataIndex: "archived_at",
      key: "archived_at",
      width: 180,
      render: (v) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(v)}
        </Text>
      ),
    },
    {
      title: "Статус",
      dataIndex: "approval_status",
      key: "approval_status",
      width: 140,
      render: (v) => (
        <Tag color="default" style={{ borderRadius: 8 }}>
          {v || "Архив"}
        </Tag>
      ),
    },
    ...(canRestore
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 120,
            align: "right",
            render: (_, record) => (
              <Popconfirm
                title="Восстановить контракт?"
                description="Контракт вернётся в статус active."
                okText="Восстановить"
                cancelText="Отмена"
                onConfirm={() => handleRestore(record)}
              >
                <Tooltip title="Восстановить">
                  <Button
                    type="text"
                    loading={restoring === record.id}
                    icon={<UndoOutlined style={{ color: "#52c41a" }} />}
                  />
                </Tooltip>
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* Шапка */}
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
            <InboxOutlined style={{ fontSize: 18, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: '#8b0000' }}
            >
              Архив контрактов
            </Title>
            {/* <Text type="secondary" style={{ fontSize: 13 }}>
              Архивные контракты филиала #{branchId}
            </Text> */}
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
              onClick={() => fetchArchive(branchId, page, pageSize)}
              loading={loading}
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
            <Text strong style={{ fontSize: 15, color: "#8b0000" }}>
              Архивные контракты
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
          {loading && items.length === 0 ? (
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
              rowKey={(r) => String(r.id ?? r.contract_id ?? Math.random())}
              loading={loading}
              columns={columns}
              dataSource={items}
              scroll={{ x: "max-content" }}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                showSizeChanger: false,
                showTotal: (t) => (
                  <span style={{ color: "#e60026", fontWeight: 600 }}>
                    Всего: {t}
                  </span>
                ),
                onChange: (p) => fetchArchive(branchId, p, pageSize),
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: "#999" }}>
                        В архиве нет контрактов
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

export default ArchivePage;