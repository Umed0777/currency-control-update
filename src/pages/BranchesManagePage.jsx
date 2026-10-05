import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Typography,
  Tooltip,
  Tag,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useBranchesAllStore } from "../store/useBranchesAll";
import { useAuthStore } from "../store/useAuth";

const { Title, Text } = Typography;

const BranchesManagePage = () => {
  const navigate = useNavigate();

  const {
    branchesAll,
    loading,
    error,
    fetchBranchesAll,
    addBranch,
    editBranch,
    removeBranch,
    clearError,
  } = useBranchesAllStore();
  const { role } = useAuthStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const normalizedRole = String(role || "").toLowerCase();
  const canManage =
    normalizedRole === "admin" || normalizedRole === "compliance";

  useEffect(() => {
    fetchBranchesAll();
  }, [fetchBranchesAll]);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

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
    try {
      await addBranch(values.id, values.name);
      message.success("Филиал создан");
      setIsCreateOpen(false);
    } catch {
      message.error("Не удалось создать филиал");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (branch) => {
    setEditingBranch(branch);
    editForm.setFieldsValue({ name: branch.name });
    setIsEditOpen(true);
  };

  const handleEditCancel = () => {
    if (submitting) return;
    setIsEditOpen(false);
  };

  const handleEditAfterClose = () => {
    setEditingBranch(null);
    setSubmitting(false);
    editForm.resetFields();
  };

  const handleEditSubmit = async () => {
    if (submitting) return;

    let values;
    try {
      values = await editForm.validateFields();
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      await editBranch(editingBranch.id, values.name);
      message.success("Филиал обновлён");
      setIsEditOpen(false);
    } catch {
      message.error("Не удалось обновить филиал");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (branchId) => {
    try {
      await removeBranch(branchId);
      message.success("Филиал удалён");
    } catch {
      message.error("Не удалось удалить филиал");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (v) => (
        <Tag color="red" style={{ borderRadius: 8, padding: "3px 10px" }}>
          {v}
        </Tag>
      ),
    },
    {
      title: "Название филиала",
      dataIndex: "name",
      key: "name",
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Создан",
      dataIndex: "created_at",
      key: "created_at",
      render: (v) => (v ? new Date(v).toLocaleString("ru-RU") : "—"),
    },
    {
      title: "Обновлён",
      dataIndex: "updated_at",
      key: "updated_at",
      render: (v) => (v ? new Date(v).toLocaleString("ru-RU") : "—"),
    },
    ...(canManage
      ? [
          {
            title: "Действия",
            key: "actions",
            width: 140,
            render: (_, record) => (
              <Space>
                <Tooltip title="Редактировать">
                  <Button
                    type="text"
                    icon={<EditOutlined style={{ color: "#8b0000" }} />}
                    onClick={() => openEdit(record)}
                  />
                </Tooltip>
                <Popconfirm
                  title="Удалить филиал?"
                  description="Если к филиалу привязаны пользователи, компании или заявки — удаление будет отклонено."
                  okText="Удалить"
                  cancelText="Отмена"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Tooltip title="Удалить">
                    <Button
                      type="text"
                      icon={<DeleteOutlined style={{ color: "#e60026" }} />}
                    />
                  </Tooltip>
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  const gradientTitle = (text) => (
    <span
      style={{
        fontWeight: 700,
        // background: "linear-gradient(90deg, #ff4b4b, #d946ef, #8b5cf6)",
        // WebkitBackgroundClip: "text",
        // WebkitTextFillColor: "transparent",
        color: '#8b0000'
      }}
    >
      {text}
    </span>
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          paddingBottom: 14,
          borderBottom: "1px solid rgba(139,0,0,0.08)",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Title
          level={2}
          style={{
            margin: 0,
            fontWeight: 700,
            // background: "linear-gradient(90deg, #ff4b4b, #d946ef, #8b5cf6)",
            // WebkitBackgroundClip: "text",
            // WebkitTextFillColor: "transparent",
            color: '#8b0000',
          }}
        >
          Управление филиалами
        </Title>

        <Space>
          {canManage && (
            <Button
              danger
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
              style={{ borderRadius: 10, background: '#8b0000', color: '#fff', border: '1px solid #8b0000' }}
            >
              Добавить филиал
            </Button>
          )}
          <Button
            danger
            icon={<ReloadOutlined />}
            onClick={() => fetchBranchesAll()}
            loading={loading}
            style={{ borderRadius: 10, background: '#8b0000', color: '#fff', border: '1px solid #8b0000' }}
          >
            Обновить
          </Button>
          <Button
            danger
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ borderRadius: 10 }}
          >
            Назад
          </Button>
        </Space>
      </div>

      <Table
        className="red-table"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={Array.isArray(branchesAll) ? branchesAll : []}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total) => (
            <span
              style={{
                fontWeight: 600,
                position: "relative",
                top: 2,
                color: '#8b0000',
              }}
            >
              Всего филиалов: {total}
            </span>
          ),
          style: { marginTop: 16},
        }}
        locale={{ emptyText: "Филиалов пока нет" }}
      />
      <Modal
        title={gradientTitle("Добавить филиал")}
        open={isCreateOpen}
        onCancel={handleCreateCancel}
        afterClose={handleCreateAfterClose}
        maskClosable={false}
        keyboard={false}
        destroyOnHidden
        forceRender
        width={520}
        style={{ top: 250, }}
        footer={[
          <Button
            key="submit"
            danger
            type="primary"
            icon={<CheckOutlined />}
            loading={submitting}
            onClick={handleCreateSubmit}
            style={{ borderRadius: 10, background: '#8b0000', color: '#fff', border: '1px solid #8b0000' }}
          >
            Сохранить
          </Button>,
          <Button
            key="cancel"
            danger
            icon={<CloseOutlined />}
            disabled={submitting}
            onClick={handleCreateCancel}
            style={{ borderRadius: 10 }}
          >
            Отмена
          </Button>,
        ]}
      >
        <Form form={createForm} layout="vertical" autoComplete="off">
          <Form.Item
            label="ID филиала"
            name="id"
            rules={[
              { required: true, message: "Введите ID филиала" },
              {
                type: "number",
                min: 1,
                message: "ID должен быть положительным числом",
              },
            ]}
          >
            <InputNumber
              placeholder="Например: номер филиала"
              style={{ width: "100%" }}
              min={1}
              precision={0}
              controls={false}
            />
          </Form.Item>

          <Form.Item
            label="Название филиала"
            name="name"
            rules={[
              { required: true, message: "Введите название филиала" },
              { min: 2, message: "Минимум 2 символа" },
              { max: 255, message: "Максимум 255 символов" },
              {
                validator: (_, value) =>
                  !value || value.trim().length > 0
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("Название не может быть пустым")
                      ),
              },
            ]}
          >
            <Input
              placeholder="Введите название филиала"
              maxLength={255}
              onPressEnter={handleCreateSubmit}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={gradientTitle("Редактировать филиал")}
        open={isEditOpen}
        onCancel={handleEditCancel}
        afterClose={handleEditAfterClose}
        maskClosable={false}
        keyboard={false}
        destroyOnHidden
        forceRender
        width={520}
        style={{ top: 250 }}
        footer={[
          <Button
            key="submit"
            danger
            type="primary"
            icon={<CheckOutlined />}
            loading={submitting}
            onClick={handleEditSubmit}
            style={{ borderRadius: 10, background: '#8b0000', color: '#fff', border: '1px solid #8b0000' }}
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
          <Form.Item label="ID филиала">
            <Input value={editingBranch?.id ?? ""} disabled />
          </Form.Item>

          <Form.Item
            label="Название филиала"
            name="name"
            rules={[
              { required: true, message: "Введите название филиала" },
              { min: 2, message: "Минимум 2 символа" },
              { max: 255, message: "Максимум 255 символов" },
              {
                validator: (_, value) =>
                  !value || value.trim().length > 0
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("Название не может быть пустым")
                      ),
              },
            ]}
          >
            <Input
              placeholder="Введите название филиала"
              maxLength={255}
              onPressEnter={handleEditSubmit}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BranchesManagePage;