import { useEffect } from "react";
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
  Tooltip,
  Popconfirm,
} from "antd";

import {
  ReloadOutlined,
  UndoOutlined,
  ArrowLeftOutlined,
  BankOutlined,
  CalendarOutlined,
  UserOutlined,
  InboxOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  GlobalOutlined,
  SendOutlined,
} from "@ant-design/icons";

import { useArchiveStore } from "../store/useArchiveStore";
import { useAuthStore } from "../store/useAuth";
import DocumentLink from "../pages/DocumentLink";

const { Title, Text } = Typography;

const RED = "#8b0000";

// Кто может восстанавливать (по Swagger: Валютный контроль, Комплаенс, Администратор)
const CAN_RESTORE = ["admin", "compliance", "currency_control"];

const STATUS_MAP = {
  draft: { label: "Черновик", color: "default" },
  active: { label: "Активный", color: "green" },
  completed: { label: "Завершён", color: "blue" },
  cancelled: { label: "Отменён", color: "red" },
  archived: { label: "В архиве", color: "purple" },
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
  const formatted = num.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency || ""}`.trim();
};

const getPersonName = (p) => {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
};

const dateCell = (v, color = RED) => (
  <Space size={6}>
    <CalendarOutlined style={{ color, fontSize: 12 }} />
    <Text style={{ fontSize: 13 }}>{formatDate(v)}</Text>
  </Space>
);

const textCell = (v, Icon) => (
  <Tooltip title={v} placement="topLeft">
    <Space size={6}>
      {Icon && <Icon style={{ color: RED, fontSize: 12 }} />}
      <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
    </Space>
  </Tooltip>
);

const dateTimeCell = (v, Icon) => (
  <Space size={4}>
    <Icon style={{ color: RED, fontSize: 11 }} />
    <Text type="secondary" style={{ fontSize: 12 }}>
      {formatDateTime(v)}
    </Text>
  </Space>
);

// Человек: ФИО + логин + email
const personCell = (person, fallbackLogin) => {
  const name = getPersonName(person);
  const login = person?.login || fallbackLogin;
  const email = person?.email;

  if (!name && !login && !email) return <Text type="secondary">—</Text>;

  return (
    <Space orientation="vertical" size={0}>
      <Text style={{ fontSize: 13 }}>
        <UserOutlined style={{ color: RED, fontSize: 11, marginRight: 6 }} />
        {name && <Text strong>{name}</Text>}
        {login && (
          <Text style={{ color: RED, fontFamily: "monospace" }}>
            {name ? " • " : ""}
            {login}
          </Text>
        )}
      </Text>
      {email && (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {email}
        </Text>
      )}
    </Space>
  );
};

// Суммы доп. соглашений: массив additional_currencies,
// если его нет — одиночные поля additional_agreement_*
const getAdditional = (r) => {
  if (Array.isArray(r.additional_currencies) && r.additional_currencies.length) {
    return r.additional_currencies;
  }
  if (r.additional_agreement_currency || r.additional_agreement_amount) {
    return [
      {
        currency: r.additional_agreement_currency,
        total_amount: r.additional_agreement_amount,
        remaining_amount: r.additional_agreement_remaining,
      },
    ];
  }
  return [];
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
      // В ответе архива нет company_id, есть client_id
      const companyId = record.company_id ?? record.client_id;
      await restoreContract(branchId, companyId, record.id);
      message.success("Контракт восстановлен");
    } catch (e) {
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось восстановить контракт",
      );
    }
  };

  const columns = [
    ...(canRestore
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 100,
            align: "center",
            // fixed: "left",
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
      title: "Предмет контракта",
      dataIndex: "subject",
      key: "subject",
      width: 220,
      ellipsis: { showTitle: false },
      render: (v) => textCell(v),
    },
    {
      title: "Клиент (ID)",
      key: "client",
      width: 120,
      render: (_, r) => (
        <Tag color="red" style={{ borderRadius: 8 }}>
          {r.client_name || r.company_name || r.client_id || "—"}
        </Tag>
      ),
    },
    {
      title: "Филиал",
      dataIndex: "branch_id",
      key: "branch_id",
      width: 100,
      render: (v) => <Text>{v ?? "—"}</Text>,
    },
    {
      title: "Сумма контракта",
      key: "total_amount",
      width: 170,
      render: (_, r) => (
        <Space orientation="vertical" size={0}>
          <Text strong style={{ color: "#d946ef", fontSize: 13 }}>
            {formatMoney(r.total_amount, r.contract_currency)}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            остаток: {formatMoney(r.remaining_amount, r.contract_currency)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Исходная сумма",
      dataIndex: "original_amount",
      key: "original_amount",
      width: 150,
      render: (v, r) => (
        <Text style={{ fontSize: 13 }}>
          {formatMoney(v, r.contract_currency)}
        </Text>
      ),
    },
    {
      title: "Доп. соглашения (суммы)",
      key: "additional",
      width: 220,
      render: (_, r) => {
        const list = getAdditional(r);
        if (!list.length) return <Text type="secondary">—</Text>;
        return (
          <Space orientation="vertical" size={4}>
            {list.map((a, i) => (
              <div key={`${a.currency}-${i}`}>
                <Text strong style={{ color: RED, fontSize: 13 }}>
                  {formatMoney(a.total_amount, a.currency)}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  остаток: {formatMoney(a.remaining_amount, a.currency)}
                </Text>
              </div>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Дата контракта",
      dataIndex: "contract_date",
      key: "contract_date",
      width: 140,
      render: (v) => dateCell(v),
    },
    {
      title: "Дата поставки",
      dataIndex: "delivery_date",
      key: "delivery_date",
      width: 140,
      render: (v) => dateCell(v),
    },
    {
      title: "Дата окончания контракта",
      dataIndex: "contract_end_date",
      key: "contract_end_date",
      width: 170,
      render: (v) => dateCell(v, "#cf1322"),
    },
    {
      title: "Срок возврата (дней)",
      dataIndex: "return_days",
      key: "return_days",
      width: 150,
      align: "center",
      render: (v) => (
        <Tag color="red" style={{ borderRadius: 8 }}>
          {v !== undefined && v !== null ? v : "—"}
        </Tag>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      width: 120,
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
      title: "Архивирован",
      dataIndex: "archived_at",
      key: "archived_at",
      width: 170,
      render: (v) => dateTimeCell(v, InboxOutlined),
    },
    {
      title: "Получатель",
      dataIndex: "receiver_name",
      key: "receiver_name",
      width: 170,
      ellipsis: { showTitle: false },
      render: (v) => textCell(v, UserOutlined),
    },
    {
      title: "Банк получателя",
      dataIndex: "receiver_bank",
      key: "receiver_bank",
      width: 170,
      ellipsis: { showTitle: false },
      render: (v) => textCell(v, BankOutlined),
    },
    {
      title: "Страна получателя",
      dataIndex: "receiver_country",
      key: "receiver_country",
      width: 170,
      render: (v) => textCell(v, GlobalOutlined),
    },
    {
      title: "Отправитель",
      dataIndex: "sender_name",
      key: "sender_name",
      width: 180,
      ellipsis: { showTitle: false },
      render: (v) => textCell(v, SendOutlined),
    },
    {
      title: "Документ",
      dataIndex: "document_path",
      key: "document_path",
      width: 280,
      render: (v, r) =>
        v ? (
          <DocumentLink entityType="contract" entityId={r.id} filePath={v} />
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Создал",
      key: "creator",
      width: 260,
      render: (_, r) => personCell(r.creator, r.created_by),
    },
    {
      title: "Создан",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v) => dateTimeCell(v, ClockCircleOutlined),
    },
    {
      title: "Обновил",
      key: "updater",
      width: 260,
      render: (_, r) => personCell(r.updater, r.updated_by),
    },
    {
      title: "Обновлён",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 160,
      render: (v) => dateTimeCell(v, HistoryOutlined),
    },
    {
      title: "Удалён",
      dataIndex: "deleted_at",
      key: "deleted_at",
      width: 160,
      render: (v) =>
        v ? dateTimeCell(v, HistoryOutlined) : <Text type="secondary">—</Text>,
    },
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
              background: RED,
              boxShadow: "0 10px 24px rgba(139,0,0,0.28)",
              flexShrink: 0,
            }}
          >
            <InboxOutlined style={{ fontSize: 18, color: "#fff" }} />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: RED }}>
            Архив контрактов
          </Title>
        </Space>

        <Space>
          <Button
            danger
            icon={<ReloadOutlined />}
            onClick={() => fetchArchive(branchId, page, pageSize)}
            loading={loading}
            style={{
              borderRadius: 12,
              height: 35,
              background: RED,
              color: "#fff",
              border: `1px solid ${RED}`,
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
            <BankOutlined style={{ color: RED, fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: RED }}>
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
              <Spin size="small" style={{ color: "#f00" }} />
            </div>
          ) : (
            <Table
              className="red-table"
              rowKey={(r) => String(r.id ?? r.contract_id)}
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
                  <span style={{ color: RED, fontWeight: 600 }}>
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