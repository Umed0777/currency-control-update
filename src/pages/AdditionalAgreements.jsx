import { useEffect, useState } from "react";
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
  DatePicker,
  Upload,
  Divider,
  Avatar,
} from "antd";

import {
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  BankOutlined,
  UserOutlined,
  DollarOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  GlobalOutlined,
  HistoryOutlined,
  InboxOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import { useAdditionalAgreementsStore } from "../store/useAdditionalAgreementsStore";
import { useAuthStore } from "../store/useAuth";
import { searchCountries, searchCurrencies } from "../api/dictionary.service";
import DocumentLink from "./DocumentLink";

const { Title, Text } = Typography;

const CAN_CREATE_EDIT = ["admin", "compliance", "operator"];
const CAN_DELETE = ["admin", "compliance", "currency_control"];

const APPROVAL_STATUS_MAP = {
  pending: { label: "В ожидании", color: "gold" },
  pending_currency_control: {
    label: "На валютном контроле",
    color: "orange",
  },
  approved: { label: "Одобрено", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
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

const formatDateShort = (value) => {
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
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  const formatted = num.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return currency ? `${formatted} ${currency}` : formatted;
};

const INITIAL_FORM_VALUES = {
  currency: "USD",
  return_days: "",
};

export const AdditionalAgreements = () => {
  const { id: branchId, companyId, contractId } = useParams();
  const navigate = useNavigate();

  const {
    agreements,
    isLoading,
    error,
    fetchAgreements,
    createAgreement,
    updateAgreement,
    deleteAgreement,
    clearError,
  } = useAdditionalAgreementsStore();

  const { role, user } = useAuthStore();

  const [activeBranchId, setActiveBranchId] = useState(branchId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [editingAgreement, setEditingAgreement] = useState(null);

  const [currencies, setCurrencies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const normalizedRole = String(role || "").toLowerCase();
  const canCreateEdit = CAN_CREATE_EDIT.includes(normalizedRole);
  const canDelete = CAN_DELETE.includes(normalizedRole);
  const safeAgreements = Array.isArray(agreements) ? agreements : [];

  useEffect(() => {
    if (activeBranchId && companyId && contractId) {
      fetchAgreements(activeBranchId, companyId, contractId);
    }
  }, [activeBranchId, companyId, contractId, fetchAgreements]);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError?.();
    }
  }, [error, clearError]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingCurrencies(true);
      try {
        const currenciesData = await searchCurrencies("");
        setCurrencies(currenciesData);
      } catch {
        message.error("Не удалось загрузить список валют");
      } finally {
        setLoadingCurrencies(false);
      }

      setLoadingCountries(true);
      try {
        const countriesData = await searchCountries("");
        setCountries(countriesData);
      } catch (err) {
        console.error("Ошибка загрузки стран:", err);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchInitialData();
  }, []);

  const getAuthor = (record) => {
    const creator = record?.creator || null;

    const rawLastName =
      creator?.last_name ||
      record?.last_name ||
      (record?.created_by === user?.login ? user?.last_name : null);

    const rawFirstName =
      creator?.first_name ||
      record?.first_name ||
      (record?.created_by === user?.login ? user?.first_name : null);

    const login =
      creator?.login ||
      record?.login ||
      record?.created_by ||
      (record?.created_by === user?.login ? user?.login : null);

    const email =
      creator?.email ||
      record?.email ||
      (record?.created_by === user?.login ? user?.email : null);

    const surname = rawFirstName || "";
    const name = rawLastName || "";
    const fullName = [surname, name].filter(Boolean).join(" ").trim();

    return { fullName, login, email };
  };

  const openCreateModal = () => {
    setEditingAgreement(null);
    form.resetFields();
    form.setFieldsValue({
      ...INITIAL_FORM_VALUES,
      branch_id: activeBranchId,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingAgreement(record);
    form.setFieldsValue({
      ...record,
      branch_id: record.branch_id || activeBranchId,
      agreement_date: record.agreement_date
        ? dayjs(record.agreement_date)
        : null,
      delivery_date: record.delivery_date ? dayjs(record.delivery_date) : null,
      agreement_end_date: record.agreement_end_date
        ? dayjs(record.agreement_end_date)
        : null,
      return_days:
        record.return_days !== undefined && record.return_days !== null
          ? String(record.return_days)
          : "",
      amount:
        record.amount !== undefined && record.amount !== null
          ? String(record.amount)
          : "",
      document: [],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (submitting) return;

    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      const effectiveBranchId = values.branch_id || activeBranchId;

      const payload = {
        agreement_number: values.agreement_number?.trim() || "",
        subject: values.subject?.trim() || "",
        agreement_date: values.agreement_date?.format("YYYY-MM-DD") || null,
        delivery_date: values.delivery_date?.format("YYYY-MM-DD") || null,
        agreement_end_date:
          values.agreement_end_date?.format("YYYY-MM-DD") || null,
        return_days: values.return_days ? Number(values.return_days) : null,
        amount: values.amount
          ? Number(String(values.amount).replace(/\s|,/g, ""))
          : 0,
        currency: values.currency || "USD",
        receiver_name: values.receiver_name?.trim() || "",
        receiver_bank: values.receiver_bank?.trim() || "",
        receiver_country: values.receiver_country || "",
        document: values.document?.[0]?.originFileObj || null,
      };

      if (editingAgreement) {
        await updateAgreement(
          effectiveBranchId,
          companyId,
          contractId,
          editingAgreement.id,
          payload
        );
        message.success("Доп. соглашение обновлено");
      } else {
        await createAgreement(
          effectiveBranchId,
          companyId,
          contractId,
          payload
        );
        message.success("Доп. соглашение создано");
      }
      if (effectiveBranchId !== activeBranchId) {
        setActiveBranchId(effectiveBranchId);
      } else {
        fetchAgreements(effectiveBranchId, companyId, contractId);
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingAgreement(null);
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      const backendMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        null;
      message.error(
        backendMsg ||
          (editingAgreement
            ? "Не удалось обновить доп. соглашение"
            : "Не удалось создать доп. соглашение")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, agreementId) => {
    e?.stopPropagation?.();
    try {
      await deleteAgreement(activeBranchId, companyId, contractId, agreementId);
      message.success("Доп. соглашение удалено в корзину");
    } catch {
      message.error("Не удалось удалить доп. соглашение");
    }
  };

  const handleOpenInvoices = (record) => {
    navigate(
      `/branches/${activeBranchId}/companies/${companyId}/contracts/${contractId}/additional-agreements/${record.id}/invoices`
    );
  };

  // Кнопка "Назад" — всегда ведёт на страницу контракта
  const handleGoBack = () => {
    navigate(
      `/branches/${activeBranchId}/companies/${companyId}/contracts/${contractId}`
    );
  };

  const columns = [
    {
      title: "Номер доп. соглашения",
      dataIndex: "agreement_number",
      key: "agreement_number",
      width: 160,
      render: (v) => <Text strong>{v || "—"}</Text>,
    },
    {
      title: "Предмет соглашения",
      dataIndex: "subject",
      key: "subject",
      width: 220,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (v, r) => (
        <Text strong style={{ color: "#8b0000", fontSize: 14 }}>
          {formatMoney(v, r.currency)}
        </Text>
      ),
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      key: "currency",
      width: 90,
      align: "center",
      render: (v) => (
        <Tag
          style={{
            borderRadius: 8,
            fontWeight: 700,
            background: "#8b0000",
            color: "#fff",
            border: "none",
            padding: "2px 10px",
          }}
        >
          {v || "—"}
        </Tag>
      ),
    },
    {
      title: "Дата соглашения",
      dataIndex: "agreement_date",
      key: "agreement_date",
      width: 140,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#8b0000", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Дата поставки",
      dataIndex: "delivery_date",
      key: "delivery_date",
      width: 140,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#8b0000", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Дата окончания",
      dataIndex: "agreement_end_date",
      key: "agreement_end_date",
      width: 140,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#8b0000", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Согласование",
      dataIndex: "approval_status",
      key: "approval_status",
      width: 180,
      render: (v) => {
        const info = APPROVAL_STATUS_MAP[v] || {
          label: v || "—",
          color: "default",
        };
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
      title: "Название получателя",
      dataIndex: "receiver_name",
      key: "receiver_name",
      width: 180,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Space size={6}>
            <UserOutlined style={{ color: "#8b0000", fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Страна получателя",
      dataIndex: "receiver_country",
      key: "receiver_country",
      width: 200,
      render: (v) => (
        <Space size={6}>
          <GlobalOutlined style={{ color: "#8b0000", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Документ",
      dataIndex: "document_path",
      key: "document_path",
      width: 300,
      render: (v, record) => (
        <DocumentLink
          entityType="additional_agreement"
          entityId={record.id}
          filePath={v}
        />
      ),
    },
    {
      title: "Создал",
      dataIndex: "created_by",
      key: "created_by",
      width: 260,
      render: (v, record) => {
        const { fullName, login, email } = getAuthor(record);
        if (!fullName && !login && !email) {
          return <Text type="secondary">—</Text>;
        }
        return (
          <Space size={6}>
            <Avatar
              size={20}
              style={{
                background: "#8b0000",
                fontSize: 10,
                marginRight: 5,
              }}
            >
              {String(v || "?").charAt(0).toUpperCase()}
            </Avatar>
            <Text style={{ fontSize: 12 }}>
              {fullName && <Text strong>{fullName}</Text>}
              {login && (
                <Text
                  style={{
                    color: "#f00",
                    fontFamily: "monospace",
                    fontWeight: 400,
                  }}
                >
                  {fullName ? " • " : ""}
                  {login}
                </Text>
              )}
              {email && (
                <Text style={{ color: "#f00", fontWeight: 700 }}>
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
      title: "Создан",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: "#8b0000", fontSize: 11 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(v)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Обновлён",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 160,
      render: (v) => (
        <Space size={4}>
          <HistoryOutlined style={{ color: "#8b0000", fontSize: 11 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(v)}
          </Text>
        </Space>
      ),
    },
    ...(canCreateEdit || canDelete
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 160,
            align: "center",
            render: (_, record) => (
              <Space size={4}>
                <Tooltip title="Инвойсы соглашения">
                  <Button
                    type="text"
                    icon={<FileTextOutlined style={{ color: "#8b0000" }} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInvoices(record);
                    }}
                  />
                </Tooltip>

                {canCreateEdit && (
                  <Tooltip title="Редактировать">
                    <Button
                      type="text"
                      icon={<EditOutlined style={{ color: "#8b0000" }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(record);
                      }}
                    />
                  </Tooltip>
                )}
                {canDelete && (
                  <Popconfirm
                    title="Удалить доп. соглашение?"
                    description="Оно будет перемещено в корзину."
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
                )}
              </Space>
            ),
          },
        ]
      : []),
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
              background: "#8b0000",
              boxShadow: "0 10px 24px rgba(139,0,0,0.28)",
              flexShrink: 0,
            }}
          >
            <FileTextOutlined style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: "#8b0000" }}
            >
              Дополнительные соглашения
            </Title>

            <Space size={10} style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Филиал:
              </Text>
              <Tag
                style={{
                  borderRadius: 8,
                  padding: "1px 10px",
                  fontWeight: 600,
                  margin: 0,
                  background: "linear-gradient(90deg, #ffe4e6, #fce7f3)",
                  color: "#8b0000",
                  border: "none",
                }}
              >
                {activeBranchId}
              </Tag>
            </Space>
          </div>
        </Space>

        <Space>
          {canCreateEdit && (
            <Button
              danger
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
              style={{
                borderRadius: 12,
                height: 35,
                background: "#8b0000",
                border: "none",
                boxShadow: "0 6px 16px rgba(139,0,0,0.35)",
                fontWeight: 600,
              }}
            >
              Создать доп. соглашение
            </Button>
          )}
          <Button
            danger
            onClick={handleGoBack}
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
              "linear-gradient(90deg, #fff5f5 0%, #ffffff 60%, #faf5ff 100%)",
            borderBottom: "1px solid rgba(139,0,0,0.06)",
          }}
        >
          <Space size={10}>
            <BankOutlined style={{ color: "#8b0000", fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: "#8b0000" }}>
              Список доп. соглашений
            </Text>
          </Space>
          <Tag
            color="red"
            style={{
              borderRadius: 8,
              padding: "2px 12px",
              fontWeight: 600,
              fontSize: 13,
              color: "#8b0000",
            }}
          >
            Всего: {safeAgreements.length}
          </Tag>
        </div>

        <div style={{ padding: 20 }}>
          {isLoading && safeAgreements.length === 0 ? (
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
              dataSource={safeAgreements}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                pageSizeOptions: ["10", "20", "50"],
                style: { marginTop: 16 },
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: "#999" }}>
                        Доп. соглашений пока нет
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
            {editingAgreement
              ? "Редактировать доп. соглашение"
              : "Создать доп. соглашение"}
          </span>
        }
        open={isModalOpen}
        onCancel={() => {
          if (!submitting) {
            setIsModalOpen(false);
            setEditingAgreement(null);
          }
        }}
        afterClose={() => {
          form.resetFields();
          setEditingAgreement(null);
        }}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        forceRender
        width={1000}
        style={{ top: 30 }}
        styles={{ body: { maxHeight: "calc(100vh - 160px)" } }}
        footer={[
          <Button
            key="submit"
            danger
            type="primary"
            icon={<CheckOutlined />}
            loading={submitting}
            onClick={handleSubmit}
            style={{
              borderRadius: 10,
              height: 35,
              background: "#8b0000",
              border: "none",
              boxShadow: "0 6px 16px rgba(139,0,0,0.35)",
              fontWeight: 600,
            }}
          >
            {editingAgreement ? "Сохранить изменения" : "Сохранить"}
          </Button>,
          <Button
            key="cancel"
            danger
            icon={<CloseOutlined />}
            disabled={submitting}
            onClick={() => {
              setIsModalOpen(false);
              setEditingAgreement(null);
            }}
            style={{ borderRadius: 10, height: 35 }}
          >
            Отмена
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          initialValues={INITIAL_FORM_VALUES}
        >
          <Divider orientation="left" style={{ marginTop: 0 }}>
            <Space>
              <FileTextOutlined style={{ color: "#8b0000" }} />
              <Text strong style={{ color: "#8b0000" }}>
                Основная информация
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                label="Номер доп. соглашения"
                name="agreement_number"
                rules={[{ required: true, message: "Введите номер" }]}
              >
                <Input
                  placeholder="Введите номер"
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item
                label="Предмет соглашения"
                name="subject"
                rules={[{ required: true, message: "Введите предмет соглашения" }]}
              >
                <Input
                  placeholder="Введите предмет соглашения"
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Дата соглашения"
                name="agreement_date"
                rules={[{ required: true, message: "Выберите дату" }]}
              >
                <DatePicker
                  placeholder="Выберите дату"
                  style={{ width: "100%", borderRadius: 10 }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Срок поставки"
                name="delivery_date"
                rules={[{ required: true, message: "Выберите дату" }]}
              >
                <DatePicker
                  placeholder="Выберите дату"
                  style={{ width: "100%", borderRadius: 10 }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Дата окончания"
                name="agreement_end_date"
                rules={[{ required: true, message: "Выберите дату" }]}
              >
                <DatePicker
                  placeholder="Выберите дату"
                  style={{ width: "100%", borderRadius: 10 }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Срок возврата"
                name="return_days"
                rules={[
                  { required: true, message: "Введите количество дней" },
                  {
                    pattern: /^[1-9]\d*$/,
                    message: "Введите целое число > 0",
                  },
                ]}
              >
                <Input
                  placeholder="Введите количество дней"
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">
            <Space>
              <DollarOutlined style={{ color: "#8b0000" }} />
              <Text strong style={{ color: "#8b0000" }}>
                Финансы
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Сумма"
                name="amount"
                rules={[
                  { required: true, message: "Введите сумму" },
                  {
                    pattern: /^\d+([.,]\d+)?$/,
                    message: "Введите сумму",
                  },
                ]}
              >
                <Input
                  placeholder="Введите сумму"
                  style={{ borderRadius: 10 }}
                  prefix={<DollarOutlined style={{ color: "#8b0000" }} />}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Валюта"
                name="currency"
                rules={[{ required: true, message: "Выберите валюту" }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите валюту"
                  style={{ borderRadius: 10 }}
                  loading={loadingCurrencies}
                  optionFilterProp="label"
                  options={currencies.map((c) => ({
                    value: c.code,
                    label: `${c.code} - ${c.name_ru}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">
            <Space>
              <UserOutlined style={{ color: "#8b0000" }} />
              <Text strong style={{ color: "#8b0000" }}>
                Получатель
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Название получателя"
                name="receiver_name"
                rules={[{ required: true, message: "Введите имя" }]}
              >
                <Input
                  placeholder="Введите название"
                  style={{ borderRadius: 10 }}
                  prefix={<UserOutlined style={{ color: "#8b0000" }} />}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Банк получателя"
                name="receiver_bank"
                rules={[{ required: true, message: "Введите банк" }]}
              >
                <Input
                  placeholder="Введите банк"
                  style={{ borderRadius: 10 }}
                  prefix={<BankOutlined style={{ color: "#8b0000" }} />}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Страна получателя"
                name="receiver_country"
                rules={[{ required: true, message: "Выберите страну" }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите страну"
                  style={{ borderRadius: 10 }}
                  loading={loadingCountries}
                  filterOption={false}
                  optionFilterProp="label"
                  options={countries.map((c) => ({
                    value: c.name_ru || c.name,
                    label: c.name_ru || c.name,
                  }))}
                  notFoundContent={
                    loadingCountries ? (
                      <Spin size="small" style={{ color: "#f00" }} />
                    ) : (
                      "Ничего не найдено"
                    )
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">
            <Space>
              <FileDoneOutlined style={{ color: "#8b0000" }} />
              <Text strong style={{ color: "#8b0000" }}>
                Документ
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={
                  editingAgreement
                    ? "Загрузить новый документ (опционально)"
                    : "Загрузить документ (PDF)"
                }
                name="document"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={
                  editingAgreement
                    ? []
                    : [{ required: true, message: "Загрузите документ" }]
                }
                extra={
                  editingAgreement && editingAgreement.document_path ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Текущий файл:{" "}
                      <Text code style={{ fontSize: 11 }}>
                        {editingAgreement.document_path.split(/[\\/]/).pop()}
                      </Text>
                    </Text>
                  ) : null
                }
              >
                <Upload.Dragger
                  beforeUpload={() => false}
                  maxCount={1}
                  accept=".pdf"
                  style={{
                    borderRadius: 12,
                    background: "#fafafa",
                    borderColor: "#8b0000",
                  }}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: "#8b0000", fontSize: 36 }} />
                  </p>
                  <p
                    className="ant-upload-text"
                    style={{ fontSize: 14, fontWeight: 600 }}
                  >
                    Нажмите или перетащите файл
                  </p>
                  <p
                    className="ant-upload-hint"
                    style={{ fontSize: 12, color: "#999" }}
                  >
                    Поддерживается только PDF
                  </p>
                </Upload.Dragger>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default AdditionalAgreements;