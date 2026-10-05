import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  UserOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../store/useAuth";
import { getRoles } from "../api/auth.service";

const { Title, Text } = Typography;

const STATUS_MAP = {
  pending: { label: "Ожидание", color: "gold" },
  approved: { label: "Успешно", color: "green" },
  accepted: { label: "Успешно", color: "green" },
  rejected: { label: "Отказ", color: "red" },
  declined: { label: "Отказ", color: "red" },
};

const ROLE_COLORS = {
  admin: "red",
  compliance: "blue",
  operator: "purple",
  branch_head: "geekblue",
  currency_control: "cyan",
  internal_audit: "orange",
  branch_user: "green",
  user: "default",
  pre_auth: "gold",
};

const AccessRequests = () => {
  const navigate = useNavigate();

  const {
    accessRequests,
    getAccessRequests,
    approveAccessRequest,
    rejectAccessRequest,
    loading,
    role,
  } = useAuthStore();

  const [actionLoading, setActionLoading] = useState(null);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const canManageRequests = role === "admin" || role === "compliance";

  useEffect(() => {
    getAccessRequests();
  }, [getAccessRequests]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setRolesLoading(true);
      try {
        const data = await getRoles();
        if (!cancelled) setRoles(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Не удалось загрузить роли:", e);
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const roleLabelMap = useMemo(() => {
    const map = {};
    roles.forEach((r) => {
      if (r?.role) map[r.role] = r.name || r.role;
    });
    return map;
  }, [roles]);

  const handleApprove = async (requestId) => {
    setActionLoading(requestId);
    const result = await approveAccessRequest(requestId);
    setActionLoading(null);

    if (!result.success) {
      message.error(result.error || "Не удалось принять заявку");
      return;
    }

    await getAccessRequests();
    message.success("Заявка принята, пользователь получил доступ");
  };

  const handleReject = async (requestId) => {
    setActionLoading(requestId);
    const result = await rejectAccessRequest(requestId);
    setActionLoading(null);

    if (!result.success) {
      message.error(result.error || "Не удалось отклонить заявку");
      return;
    }

    message.success("Заявка отклонена");
    await getAccessRequests();
  };

  const columns = [
    {
      title: "Пользователь",
      key: "user",
      render: (_, record) => {
        const firstName =
          record.first_name || record.firstname || record.name || "";
        const lastName =
          record.last_name || record.lastname || record.surname || "";
        const login = record.login || record.email || record.username || "—";
        return (
          <Space>
            <UserOutlined style={{ color: "#ff4b4b", fontSize: 18 }} />
            <div>
              <div style={{ fontWeight: 600 }}>
                {firstName} {lastName}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {login}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: "Филиал",
      key: "branch",
      render: (_, record) => {
        const branchId =
          record.branch_id ??
          record.branchId ??
          record.branch?.id ??
          record.branch?.branch_id ??
          null;

        const branchName =
          record.branch_name ||
          record.branchName ||
          record.branch?.name ||
          record.branch?.branch_name ||
          "";

        if (branchId != null && branchName) {
          return <span>{`${branchId} ${branchName}`}</span>;
        }
        if (branchName) return <span>{branchName}</span>;
        if (branchId != null) return <span>{branchId}</span>;
        return "—";
      },
    },
    {
      title: "Роль",
      key: "role",
      render: (_, record) => {
        const raw = String(
          record.role || record.requested_role || ""
        ).toLowerCase();

        const label = roleLabelMap[raw] || raw || "—";
        const color = ROLE_COLORS[raw] || "default";

        return (
          <Tag color={color} style={{ borderRadius: 8, padding: "3px 10px" }}>
            {rolesLoading && !roleLabelMap[raw] ? "…" : label}
          </Tag>
        );
      },
    },
    {
      title: "Статус",
      key: "status",
      render: (_, record) => {
        const raw = String(
          record.status || record.state || "pending"
        ).toLowerCase();

        const { label, color } = STATUS_MAP[raw] || {
          label: raw,
          color: "default",
        };

        return (
          <Tag color={color} style={{ borderRadius: 8, padding: "3px 10px" }}>
            {label}
          </Tag>
        );
      },
    },
    {
      title: "Дата",
      key: "date",
      render: (_, record) => {
        const date =
          record.created_at ||
          record.createdAt ||
          record.requested_at ||
          record.requestedAt;
        if (!date) return "—";
        return new Date(date).toLocaleString("ru-RU");
      },
    },
    ...(canManageRequests
      ? [
          {
            title: "Действия",
            key: "actions",
            width: 230,
            render: (_, record) => (
              <Space>
                <Popconfirm
                  title="Принять заявку?"
                  description="Пользователю будет предоставлен доступ."
                  okText="Принять"
                  cancelText="Отмена"
                  onConfirm={() => handleApprove(record.id)}
                >
                  <Button
                    danger
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={actionLoading === record.id}
                    style={{ borderRadius: 8 }}
                  >
                    Принять
                  </Button>
                </Popconfirm>

                <Popconfirm
                  title="Отклонить заявку?"
                  description="Заявка будет отклонена."
                  okText="Отклонить"
                  cancelText="Отмена"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleReject(record.id)}
                >
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    loading={actionLoading === record.id}
                    style={{ borderRadius: 8 }}
                  >
                    Отклонить
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  if (!canManageRequests) {
    return (
      <Card
        style={{
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.07)",
        }}
      >
        <Empty description={<span>У вас нет доступа к обработке заявок</span>} />
      </Card>
    );
  }

  return (
    <div>
      <Card
        style={{
          marginBottom: 20,
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.07)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Title
              level={2}
              style={{
                margin: 0,
                // background:
                //   "linear-gradient(90deg, #ff4b4b, #d946ef, #8b5cf6)",
                // WebkitBackgroundClip: "text",
                // WebkitTextFillColor: "transparent",
                color: '#8b0000',
              }}
            >
              Заявки на доступ
            </Title>
            <Text type="secondary">
              Просмотр и обработка запросов пользователей
            </Text>
          </div>

          <Space>
            <Button
              danger
              icon={<ReloadOutlined />}
              onClick={() => getAccessRequests()}
              loading={loading}
              size="middle"
              style={{ borderRadius: 10, background: '#8b0000', color: '#fff', border: '1px solid #8b0000' }}
            >
              Обновить
            </Button>
            <Button
              danger
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              size="middle"
              style={{ borderRadius: 10 }}
            >
              Назад
            </Button>
          </Space>
        </div>
      </Card>

      <Card
        style={{
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.07)",
        }}
      >
        {loading && accessRequests.length === 0 ? (
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
            rowKey={(record) => String(record.id)}
            columns={columns}
            dataSource={accessRequests}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => (
                <span
                  style={{
                    color: "#ff4d4f",
                    fontWeight: 600,
                    position: "relative",
                    top: 2,
                  }}
                >
                  Всего заявок: {total}
                </span>
              ),
            }}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty description="Заявок пока нет" /> }}
          />
        )}
      </Card>
    </div>
  );
};

export default AccessRequests;