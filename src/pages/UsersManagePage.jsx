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
} from "antd";

import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  BankOutlined,
  TeamOutlined,
  MailOutlined,
  IdcardOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";
import { useUsersStore } from "../store/useUsersStore";
import { useBranchesAllStore } from "../store/useBranchesAll";
import { useAuthStore } from "../store/useAuth";

const { Title, Text } = Typography;

// === Роли с полным доступом к управлению пользователями ===
const ADMIN_ROLES = new Set(["admin", "administrator", "superadmin"]);
const MANAGER_ROLES = new Set([...ADMIN_ROLES, "compliance"]);

// === Цвета ролей ===
const ROLE_COLORS = {
  admin: "red",
  administrator: "red",
  superadmin: "volcano",
  compliance: "purple",
  operator: "blue",
  currency_control: "orange",
  pre_auth: "gold",
  branch_head: "geekblue",
  internal_audit: "cyan",
};

// === Роль admin всегда должна быть доступна для назначения (если ты admin) ===
const ADMIN_ROLE_OPTION = { value: "admin", label: "Администратор" };

const FALLBACK_ROLE_OPTIONS = [
  { value: "admin", label: "Администратор" },
  { value: "compliance", label: "Комплаенс" },
  { value: "operator", label: "Оператор" },
  { value: "currency_control", label: "Валютный контроль" },
  { value: "branch_head", label: "Руководитель филиала" },
];

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

const UsersManagePage = () => {
  const navigate = useNavigate();

  const {
    users,
    isLoading,
    isSubmitting,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    clearError,
  } = useUsersStore();

  const { branchesAll, fetchBranchesAll } = useBranchesAllStore();

  // ✅ getRoles из useAuth
  const { role, roles, getRoles } = useAuthStore();

  const normalizedRole = String(role || "").trim().toLowerCase();
  const isAdmin = ADMIN_ROLES.has(normalizedRole);
  const canManage = MANAGER_ROLES.has(normalizedRole);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const [searchValue, setSearchValue] = useState("");
  const [searchField, setSearchField] = useState("all");

  const safeUsers = Array.isArray(users) ? users : [];
  const safeBranches = Array.isArray(branchesAll) ? branchesAll : [];
  const safeRoles = Array.isArray(roles) ? roles : [];

  // === Загрузка данных при монтировании ===
  useEffect(() => {
    fetchUsers().catch(() => {});
    if (safeBranches.length === 0) {
      fetchBranchesAll?.().catch(() => {});
    }
    // ✅ Загружаем роли через getRoles
    if (safeRoles.length === 0) {
      getRoles?.().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === Показ ошибок ===
  useEffect(() => {
    if (error) {
      message.error(error);
      clearError?.();
    }
  }, [error, clearError]);

  // === Опции ролей для выпадающего списка ===
  const roleOptions = useMemo(() => {
    // Базовый список из API
    let options =
      safeRoles.length > 0
        ? safeRoles.map((r) => ({ value: r.role, label: r.name }))
        : [...FALLBACK_ROLE_OPTIONS];

    // Если ты admin — гарантируем, что роль admin есть в списке
    if (isAdmin && !options.some((o) => o.value === "admin")) {
      options = [ADMIN_ROLE_OPTION, ...options];
    }

    // Если ты НЕ admin — убираем возможность назначать admin
    if (!isAdmin) {
      options = options.filter((o) => o.value !== "admin");
    }

    return options;
  }, [safeRoles, isAdmin]);

  // === Маппинг ролей для таблицы ===
  const roleMap = useMemo(() => {
    const map = {};
    if (safeRoles.length > 0) {
      safeRoles.forEach((r) => {
        map[r.role] = {
          label: r.name,
          color: ROLE_COLORS[r.role] || "default",
        };
      });
    } else {
      FALLBACK_ROLE_OPTIONS.forEach((o) => {
        map[o.value] = {
          label: o.label,
          color: ROLE_COLORS[o.value] || "default",
        };
      });
      map.pre_auth = { label: "Ожидает одобрения", color: "gold" };
    }
    // Гарантируем отображение admin
    if (!map.admin) {
      map.admin = { label: "Администратор", color: "red" };
    }
    return map;
  }, [safeRoles]);

  // === Фильтрация ===
  const filteredUsers = useMemo(() => {
    const q = String(searchValue || "").trim().toLowerCase();
    if (!q) return safeUsers;

    return safeUsers.filter((u) => {
      const branchName =
        u.branch_name ||
        safeBranches.find((b) => String(b.id) === String(u.branch_id))?.name ||
        "";

      const fields = {
        all: [
          u.login,
          u.email,
          u.first_name,
          u.last_name,
          branchName,
          roleMap[u.role]?.label || u.role,
        ],
        login: [u.login],
        email: [u.email],
        name: [u.first_name, u.last_name],
        branch: [branchName],
        role: [roleMap[u.role]?.label || u.role],
      };

      const list = fields[searchField] || fields.all;
      return list.some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [safeUsers, searchValue, searchField, safeBranches, roleMap]);

  // === Создание ===
  const openCreate = () => {
    createForm.resetFields();
    const defaultRole = roleOptions[0]?.value || "operator";
    createForm.setFieldsValue({ role: defaultRole, branch_id: undefined });
    setIsCreateOpen(true);
  };

  const handleCreateCancel = () => {
    if (isSubmitting) return;
    setIsCreateOpen(false);
  };

  const handleCreateAfterClose = () => {
    createForm.resetFields();
  };

  const handleCreateSubmit = async () => {
    if (isSubmitting) return;
    let values;
    try {
      values = await createForm.validateFields();
    } catch {
      return;
    }

    try {
      await createUser({
        branch_id: values.branch_id,
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        login: values.login,
        role: values.role,
      });
      message.success("Пользователь создан");
      setIsCreateOpen(false);
      await fetchUsers().catch(() => {});
    } catch (e) {
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось создать пользователя"
      );
    }
  };

  const openEdit = (record) => {
    setEditingUser(record);
    editForm.setFieldsValue({
      branch_id: record.branch_id ?? undefined,
      role: record.role || roleOptions[0]?.value || "operator",
    });
    setIsEditOpen(true);
  };

  const handleEditCancel = () => {
    if (isSubmitting) return;
    setIsEditOpen(false);
  };

  const handleEditAfterClose = () => {
    setEditingUser(null);
    editForm.resetFields();
  };

  const handleEditSubmit = async () => {
    if (isSubmitting) return;
    if (!editingUser) return;

    let values;
    try {
      values = await editForm.validateFields();
    } catch {
      return;
    }

    try {
      await updateUser(editingUser.id, {
        branch_id: values.branch_id,
        role: values.role,
      });
      message.success("Пользователь обновлён");
      setIsEditOpen(false);
      await fetchUsers().catch(() => {});
    } catch (e) {
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось обновить пользователя"
      );
    }
  };

  const handleDelete = async (e, userId) => {
    e?.stopPropagation?.();
    try {
      await deleteUser(userId);
      message.success("Пользователь удалён");
      await fetchUsers().catch(() => {});
    } catch (e) {
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось удалить пользователя"
      );
    }
  };

  const columns = [
    {
      title: "Пользователь",
      key: "user",
      width: 260,
      render: (_, record) => {
        const fullName = [record.last_name, record.first_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        return (
          <Space size={10} align="center">
            <Avatar
              size={30}
              style={{
                // background: "linear-gradient(135deg, #ff4b4b, #d946ef)",
                background:"#8b0000",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {String(record.login || "?")
                .charAt(0)
                .toUpperCase()}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ fontSize: 13, display: "block" }}>
                {fullName || record.login || "—"}
              </Text>
              <Text
                type="secondary"
                style={{ fontSize: 11, fontFamily: "monospace" }}
              >
                @{record.login || "—"}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 220,
      render: (v) => (
        <Space size={6}>
          <MailOutlined style={{ color: "#8b0000", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Роль",
      dataIndex: "role",
      key: "role",
      width: 200,
      render: (v) => {
        const info = roleMap[v] || { label: v || "—", color: "default" };
        return (
          <Tag
            color={info.color}
            style={{ borderRadius: 8, fontWeight: 500, padding: "2px 10px" }}
          >
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: "Филиал",
      key: "branch",
      width: 240,
      render: (_, record) => {
        const branchName =
          record.branch_name ||
          safeBranches.find(
            (b) => String(b.id) === String(record.branch_id)
          )?.name ||
          "—";
        return (
          <Space size={6}>
            <BankOutlined style={{ color: "#8b0000", fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>
              {branchName}
              {record.branch_id ? (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {" "}
                  {/* (#{record.branch_id}) */}
                </Text>
              ) : null}
            </Text>
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
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(v)}
        </Text>
      ),
    },
    ...(canManage
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 120,
            align: "center",
            render: (_, record) => (
              <Space size={4}>
                <Tooltip title="Редактировать">
                  <Button
                    type="text"
                    icon={<EditOutlined style={{ color: "#8b0000" }} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(record);
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title="Удалить пользователя?"
                  description="Пользователь будет удалён из системы. Все его сессии будут отозваны."
                  okText="Удалить"
                  cancelText="Отмена"
                  okButtonProps={{ danger: true }}
                  onConfirm={(e) => handleDelete(e, record.id)}
                  onCancel={(e) => e?.stopPropagation?.()}
                >
                  <Tooltip title="Удалить">
                    <Button
                      type="text"
                      icon={<DeleteOutlined style={{ color: "#e60026" }} />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  if (!canManage) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Empty
          description={
            <Text type="secondary">
              У вас нет доступа к управлению пользователями
            </Text>
          }
        />
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
              background: "#8b0000",
              boxShadow: "0 10px 24px rgba(217,70,239,0.28)",
              flexShrink: 0,
            }}
          >
            <TeamOutlined style={{ fontSize: 18, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: "#8b0000" }}
            >
              Управление пользователями
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Список всех зарегистрированных пользователей системы
            </Text>
          </div>
        </Space>

        <Space>
          <Button
            danger
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            style={{
              borderRadius: 12,
              height: 35,
              background: "#8b0000",
              border: "none",
              boxShadow: "0 6px 16px rgba(217,70,239,0.35)",
              fontWeight: 600,
            }}
          >
            Добавить пользователя
          </Button>
          <Button
            danger
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
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Text style={{ display: "block", marginBottom: 8, fontSize: 14, color: "#8b0000", }}>
              Поле поиска:
            </Text>
            <Select
              value={searchField}
              onChange={setSearchField}
              style={{ width: "100%", border: '1px solid #8b0000' }}
              options={[
                { value: "all", label: "Все поля" },
                { value: "login", label: "Логин" },
                { value: "email", label: "Email" },
                { value: "name", label: "ФИО" },
                { value: "branch", label: "Филиал" },
                { value: "role", label: "Роль" },
              ]}
            />
          </Col>

          <Col xs={24} md={16}>
            <Text style={{ display: "block", marginBottom: 8, fontSize: 14, color: "#8b0000", }}>
              Поиск
            </Text>
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Введите значение..."
              allowClear
              prefix={<SearchOutlined style={{ color: "#8b0000" }} />}
              style={{ borderRadius: 10, height: 35 }}
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
              "linear-gradient(90deg, #fff5f5 0%, #ffffff 60%, #faf5ff 100%)",
            borderBottom: "1px solid rgba(139,0,0,0.06)",
          }}
        >
          <Space size={10}>
            <UserOutlined style={{ color: "#8b0000", fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: "#8b0000", }}>
              Пользователи системы
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
            Всего: {filteredUsers.length}
          </Tag>
        </div>

        <div style={{ padding: 20 }}>
          {isLoading && safeUsers.length === 0 ? (
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
              dataSource={filteredUsers}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                // showTotal: (total) => (
                //   <span
                //     style={{
                //       color: "#8b0000",
                //       fontWeight: 600,
                //       position: "relative",
                //       top: 2,
                //     }}
                //   >
                //     Всего: {total}
                //   </span>
                // ),
                style: { marginTop: 16 },
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: "#999" }}>
                        {searchValue
                          ? "Ничего не найдено"
                          : "Пользователей пока нет"}
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
          <span style={{ fontWeight: 700, color: "#8b0000", fontSize: 17 }}>
            Добавить пользователя
          </span>
        }
        open={isCreateOpen}
        onCancel={handleCreateCancel}
        afterClose={handleCreateAfterClose}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        forceRender
        width={560}
        style={{ top: 80 }}
        footer={[
          <Button
            key="submit"
            danger
            type="primary"
            icon={<CheckOutlined />}
            loading={isSubmitting}
            onClick={handleCreateSubmit}
            style={{
              borderRadius: 10,
              height: 35,
              background: "#8b0000",
              border: "none",
              fontWeight: 600,
            }}
          >
            Сохранить
          </Button>,
          <Button
            key="cancel"
            danger
            icon={<CloseOutlined />}
            disabled={isSubmitting}
            onClick={handleCreateCancel}
            style={{ borderRadius: 10, height: 35 }}
          >
            Отмена
          </Button>,
        ]}
      >
        <Form form={createForm} layout="vertical" autoComplete="off">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Имя"
                name="first_name"
                rules={[{ required: true, message: "Введите имя" }]}
              >
                <Input
                  placeholder="Введите имя"
                  prefix={<UserOutlined style={{ color: "#8b0000" }} />}
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Фамилия"
                name="last_name"
                rules={[{ required: true, message: "Введите фамилию" }]}
              >
                <Input
                  placeholder="Введите фамилию"
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Логин"
            name="login"
            rules={[{ required: true, message: "Введите логин" }]}
          >
            <Input
              placeholder="Введите логин"
              prefix={<IdcardOutlined style={{ color: "#8b0000" }} />}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Введите email" },
              { type: "email", message: "Некорректный email" },
            ]}
          >
            <Input
              placeholder="example@mail.com"
              prefix={<MailOutlined style={{ color: "#8b0000" }} />}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item
            label="Роль"
            name="role"
            rules={[{ required: true, message: "Выберите роль" }]}
          >
            <Select
              placeholder="Выберите роль"
              options={roleOptions}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item
            label="Филиал"
            name="branch_id"
            rules={[{ required: true, message: "Выберите филиал" }]}
          >
            <Select
              showSearch
              placeholder="Выберите филиал"
              optionFilterProp="label"
              options={safeBranches.map((b) => ({
                value: b.id,
                label: b.name || `Филиал #${b.id}`,
              }))}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <span style={{ fontWeight: 700, color: "#8b0000", fontSize: 17 }}>
            Изменить пользователя
          </span>
        }
        open={isEditOpen}
        onCancel={handleEditCancel}
        afterClose={handleEditAfterClose}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        forceRender
        width={480}
        style={{ top: 120 }}
        footer={[
          <Button
            key="submit"
            danger
            type="primary"
            icon={<CheckOutlined />}
            loading={isSubmitting}
            onClick={handleEditSubmit}
            style={{
              borderRadius: 10,
              height: 35,
              background: "#8b0000",
              border: "none",
              fontWeight: 600,
            }}
          >
            Сохранить
          </Button>,
          <Button
            key="cancel"
            danger
            icon={<CloseOutlined />}
            disabled={isSubmitting}
            onClick={handleEditCancel}
            style={{ borderRadius: 10, height: 35 }}
          >
            Отмена
          </Button>,
        ]}
      >
        {editingUser && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background: "#faf5ff",
              border: "1px solid #e9d5ff",
            }}
          >
            <Space size={10}>
              <Avatar
                size={36}
                style={{
                  background: "#8b0000",
                  fontWeight: 700,
                }}
              >
                {String(editingUser.login || "?")
                  .charAt(0)
                  .toUpperCase()}
              </Avatar>
              <div>
                <Text strong style={{ display: "block" }}>
                  {[editingUser.last_name, editingUser.first_name]
                    .filter(Boolean)
                    .join(" ") || editingUser.login}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  @{editingUser.login} • {editingUser.email}
                </Text>
              </div>
            </Space>
          </div>
        )}

        <Form form={editForm} layout="vertical" autoComplete="off">
          <Form.Item
            label="Роль"
            name="role"
            rules={[{ required: true, message: "Выберите роль" }]}
          >
            <Select
              placeholder="Выберите роль"
              options={roleOptions}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item
            label="Филиал"
            name="branch_id"
            rules={[{ required: true, message: "Выберите филиал" }]}
          >
            <Select
              showSearch
              placeholder="Выберите филиал"
              optionFilterProp="label"
              options={safeBranches.map((b) => ({
                value: b.id,
                label: b.name || `Филиал #${b.id}`,
              }))}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersManagePage;