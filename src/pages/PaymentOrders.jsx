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
  InputNumber,
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
  NumberOutlined,
  CreditCardOutlined,
  SendOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import { usePaymentOrderStore } from "../store/usePaymentOrderStore";
import { useAuthStore } from "../store/useAuth";
import { searchCurrencies, searchCountries } from "../api/dictionary.service";
import DocumentLink from "./DocumentLink";

const { Title, Text } = Typography;

const CAN_CREATE_EDIT = ["admin", "compliance", "currency_control", "operator"];
const CAN_EDIT = ["admin", "compliance", "currency_control"];
const CAN_DELETE = ["admin", "compliance", "currency_control"];

// ==================== ХЕЛПЕРЫ ДЛЯ ОПЦИЙ ====================
const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value?.results && Array.isArray(value.results)) return value.results;
  if (value?.data && Array.isArray(value.data)) return value.data;
  return [];
};

const buildCurrencyOptions = (currencies) =>
  toArray(currencies).map((c, index) => {
    const code = c?.code || c?.iso_code || c?.currency_code || c?.id || "";
    const name = c?.name_ru || c?.name || c?.title || "";
    return {
      value: String(code || index),
      label: `${code}${name ? ` — ${name}` : ""}`.trim(),
    };
  });

const buildCountryOptions = (countries) =>
  toArray(countries).map((c, index) => {
    const name = c?.name_ru || c?.name || c?.title || "";
    return {
      value: String(name || c?.id || index),
      label: String(name || c?.id || index),
    };
  });

const filterByLabel = (input, option) =>
  String(option?.label || "")
    .toLowerCase()
    .includes(String(input || "").toLowerCase());

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

const formatDateShort = (value) => {
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
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  const formatted = num.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return currency ? `${formatted} ${currency}` : formatted;
};

export const PaymentOrders = () => {
  const { id: branchId, companyId, contractId, invoiceId } = useParams();
  const navigate = useNavigate();

  const {
    paymentOrders,
    isLoading,
    error,
    fetchPaymentOrders,
    createPaymentOrder,
    updatePaymentOrder,
    deletePaymentOrder,
    clearError,
  } = usePaymentOrderStore();

  const { role, user } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [editingPo, setEditingPo] = useState(null);

  const [currencies, setCurrencies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const normalizedRole = String(role || "").toLowerCase();
  const canCreateEdit = CAN_CREATE_EDIT.includes(normalizedRole);
  const canEdit = CAN_EDIT.includes(normalizedRole);
  const canDelete = CAN_DELETE.includes(normalizedRole);
  const safePO = Array.isArray(paymentOrders) ? paymentOrders : [];

  const currencyOptions = buildCurrencyOptions(currencies);
  const countryOptions = buildCountryOptions(countries);

  useEffect(() => {
    if (branchId && companyId && contractId && invoiceId) {
      fetchPaymentOrders(branchId, companyId, contractId, invoiceId);
    }
  }, [branchId, companyId, contractId, invoiceId, fetchPaymentOrders]);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError?.();
    }
  }, [error, clearError]);

  useEffect(() => {
    const load = async () => {
      setLoadingCurrencies(true);
      try {
        const data = await searchCurrencies("");
        setCurrencies(toArray(data));
      } catch {
        message.error("Не удалось загрузить список валют");
      } finally {
        setLoadingCurrencies(false);
      }

      setLoadingCountries(true);
      try {
        const data = await searchCountries("");
        setCountries(toArray(data));
      } catch (err) {
        console.error("Ошибка загрузки стран:", err);
      } finally {
        setLoadingCountries(false);
      }
    };
    load();
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

    const fullName = [rawFirstName, rawLastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return { fullName, login, email };
  };

  const openCreateModal = () => {
    setEditingPo(null);
    form.resetFields();
    form.setFieldsValue({
      currency: "USD",
      operation_date: dayjs(),
      value_date: dayjs(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingPo(record);
    form.setFieldsValue({
      ...record,
      operation_date: record.operation_date
        ? dayjs(record.operation_date)
        : null,
      value_date: record.value_date ? dayjs(record.value_date) : null,
      amount:
        record.amount !== undefined && record.amount !== null
          ? String(record.amount)
          : "",
      // ✅ Поля отправителя
      sender_name: record.sender_name || "",
      sender_bank: record.sender_bank || "",
      sender_country: record.sender_country || "",
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
      const payload = {
        operation_date: values.operation_date?.format("YYYY-MM-DD") || null,
        payment_order_number: values.payment_order_number?.trim() || "",
        amount: values.amount
          ? Number(String(values.amount).replace(/\s|,/g, ""))
          : 0,
        currency: values.currency || "USD",
        payer: values.payer?.trim() || "",
        receiver_name: values.receiver_name?.trim() || "",
        receiver_bank: values.receiver_bank?.trim() || "",
        payment_purpose: values.payment_purpose?.trim() || "",
        receiver_country: values.receiver_country || "",
        value_date: values.value_date?.format("YYYY-MM-DD") || null,
        // ✅ Поля отправителя
        sender_name: values.sender_name?.trim() || "",
        sender_bank: values.sender_bank?.trim() || "",
        sender_country: values.sender_country || "",
        document: values.document?.[0]?.originFileObj || null,
      };

      if (editingPo) {
        await updatePaymentOrder(
          branchId,
          companyId,
          contractId,
          invoiceId,
          editingPo.id,
          payload,
        );
        message.success("Платёжное поручение обновлено");
      } else {
        await createPaymentOrder(
          branchId,
          companyId,
          contractId,
          invoiceId,
          payload,
        );
        message.success("Платёжное поручение создано");
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingPo(null);

      fetchPaymentOrders(branchId, companyId, contractId, invoiceId);
    } catch (err) {
      console.error("Ошибка сохранения ПП:", err);
      const backendMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        null;
      message.error(
        backendMsg ||
          (editingPo
            ? "Не удалось обновить платёжное поручение"
            : "Не удалось создать платёжное поручение"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, poId) => {
    e?.stopPropagation?.();
    try {
      await deletePaymentOrder(
        branchId,
        companyId,
        contractId,
        invoiceId,
        poId,
      );
      message.success("Платёжное поручение удалено в корзину");
    } catch {
      message.error("Не удалось удалить платёжное поручение");
    }
  };

  const columns = [
    {
      title: "Номер ПП",
      dataIndex: "payment_order_number",
      key: "payment_order_number",
      width: 160,
      render: (v) => <Text strong>{v || "—"}</Text>,
    },
    {
      title: "Дата операции",
      dataIndex: "operation_date",
      key: "operation_date",
      width: 140,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#8b0000", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Дата валютирования",
      dataIndex: "value_date",
      key: "value_date",
      width: 180,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#8b0000", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (v, r) => (
        <Text strong style={{ color: "#d946ef", fontSize: 14 }}>
          {formatMoney(v, r.currency)}
        </Text>
      ),
    },
    {
      title: "Плательщик",
      dataIndex: "payer",
      key: "payer",
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
      title: "Название получатель",
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
      title: "Банк получателя",
      dataIndex: "receiver_bank",
      key: "receiver_bank",
      width: 200,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Space size={6}>
            <BankOutlined style={{ color: "#8b0000", fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Страна получателя",
      dataIndex: "receiver_country",
      key: "receiver_country",
      width: 170,
      render: (v) => (
        <Space size={6}>
          <GlobalOutlined style={{ color: "#8b0000", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Отправитель",
      dataIndex: "sender_name",
      key: "sender_name",
      width: 180,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Space size={6}>
            {/* <SendOutlined style={{ color: "#8b5cf6", fontSize: 12 }} /> */}
            <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Банк отправителя",
      dataIndex: "sender_bank",
      key: "sender_bank",
      width: 180,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Space size={6}>
            <BankOutlined style={{ color: "#8b0000", fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Страна отправителя",
      dataIndex: "sender_country",
      key: "sender_country",
      width: 180,
      render: (v) => (
        <Space size={6}>
          <GlobalOutlined style={{ color: "#8b0000", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Назначение платежа",
      dataIndex: "payment_purpose",
      key: "payment_purpose",
      width: 220,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Создал",
      dataIndex: "created_by",
      key: "created_by",
      width: 240,
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
          <ClockCircleOutlined style={{ color: "#8b5cf6", fontSize: 11 }} />
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
          <HistoryOutlined style={{ color: "#d946ef", fontSize: 11 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(v)}
          </Text>
        </Space>
      ),
    },
    ...(canDelete || canEdit
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 100,
            align: "right",
            render: (_, record) => (
              <Space size={4}>
                {canEdit && (
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
                    title="Удалить платёжное поручение?"
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
              boxShadow: "0 10px 24px rgba(217,70,239,0.28)",
              flexShrink: 0,
            }}
          >
            <CreditCardOutlined style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: "#8b0000" }}
            >
              Платёжные поручения
            </Title>
            <Space size={10} style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Филиал:
              </Text>
              <Tag
                color="red"
                style={{
                  borderRadius: 8,
                  padding: "1px 10px",
                  fontWeight: 600,
                  margin: 0,
                  color: "#8b0000",
                }}
              >
                {branchId}
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
                boxShadow: "0 6px 16px rgba(217,70,239,0.35)",
                fontWeight: 600,
              }}
            >
              Добавить платёжное поручение
            </Button>
          )}
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
              Список платёжных поручений
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
            Всего: {safePO.length}
          </Tag>
        </div>

        <div style={{ padding: 20 }}>
          {isLoading && safePO.length === 0 ? (
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
              dataSource={safePO}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                style: { marginTop: 16 },
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: "#999" }}>
                        Платёжных поручений пока нет
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
            {editingPo
              ? "Редактировать платёжное поручение"
              : "Создать платёжное поручение"}
          </span>
        }
        open={isModalOpen}
        onCancel={() => {
          if (!submitting) {
            setIsModalOpen(false);
            setEditingPo(null);
          }
        }}
        afterClose={() => {
          form.resetFields();
          setEditingPo(null);
        }}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        forceRender
        width={1000}
        style={{ top: 20 }}
        styles={{ body: { maxHeight: "calc(100vh - 20px)" } }}
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
              boxShadow: "0 6px 16px rgba(217,70,239,0.35)",
              fontWeight: 600,
            }}
          >
            {editingPo ? "Сохранить изменения" : "Сохранить"}
          </Button>,
          <Button
            key="cancel"
            danger
            icon={<CloseOutlined />}
            disabled={submitting}
            onClick={() => {
              setIsModalOpen(false);
              setEditingPo(null);
            }}
            style={{ borderRadius: 10, height: 35 }}
          >
            Отмена
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Divider orientation="left" style={{ marginTop: 0 }}>
            <Space>
              <FileTextOutlined style={{ color: "#8b0000" }} />
              <Text strong style={{ color: "#8b0000" }}>
                Основная информация
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Номер платёжного поручения"
                name="payment_order_number"
                rules={[{ required: true, message: "Введите номер ПП" }]}
              >
                <Input
                  placeholder="Введите номер ПП"
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Дата операции"
                name="operation_date"
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

          <Divider orientation="left">
            <Space>
              <DollarOutlined style={{ color: "#8b0000" }} />
              <Text strong style={{ color: "#8b0000" }}>
                Финансы
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Сумма платежа"
                name="amount"
                rules={[{ required: true, message: "Введите сумму" }]}
              >
                <InputNumber
                  style={{ width: "100%", borderRadius: 10 }}
                  placeholder="Введите сумму"
                  min={0}
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                  prefix={<DollarOutlined style={{ color: "#8b0000" }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Валюта платежа"
                name="currency"
                rules={[{ required: true, message: "Выберите валюту" }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите валюту"
                  style={{ borderRadius: 10, border: "1px solid #8b0000" }}
                  loading={loadingCurrencies}
                  filterOption={filterByLabel}
                  options={currencyOptions}
                  notFoundContent={
                    loadingCurrencies ? (
                      <Spin size="small" style={{ color: "#f00" }} />
                    ) : (
                      "Ничего не найдено"
                    )
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Дата валютирования"
                name="value_date"
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

          <Divider orientation="left">
            <Space>
              <UserOutlined style={{ color: "#8b0000" }} />
              <Text strong style={{ color: "#8b0000" }}>
                Плательщик и получатель
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Плательщик"
                name="payer"
                rules={[{ required: true, message: "Введите плательщика" }]}
              >
                <Input
                  placeholder="Введите плательщика"
                  style={{ borderRadius: 10 }}
                  prefix={<UserOutlined style={{ color: "#8b0000" }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Название получателя"
                name="receiver_name"
                rules={[{ required: true, message: "Введите получателя" }]}
              >
                <Input
                  placeholder="Введите получателя"
                  style={{ borderRadius: 10 }}
                  prefix={<UserOutlined style={{ color: "#8b0000" }} />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
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
            <Col span={12}>
              <Form.Item
                label="Страна получателя"
                name="receiver_country"
                rules={[{ required: true, message: "Выберите страну" }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите страну"
                  style={{ borderRadius: 10, border: "1px solid #8b0000" }}
                  loading={loadingCountries}
                  filterOption={filterByLabel}
                  options={countryOptions}
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

          {/* ✅ РАЗДЕЛ: Отправитель */}
          <Divider orientation="left">
            <Space>
              <SendOutlined style={{ color: "#8b0000" }} />
              <Text strong style={{ color: "#8b0000" }}>
                Отправитель
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Название отправителя"
                name="sender_name"
                rules={[{ required: true, message: "Введите название" }]}
              >
                <Input
                  placeholder="Введите название отправителя"
                  style={{ borderRadius: 10 }}
                  prefix={<SendOutlined style={{ color: "#8b0000" }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Банк отправителя"
                name="sender_bank"
                rules={[{ required: true, message: "Введите банк" }]}
              >
                <Input
                  placeholder="Введите банк отправителя"
                  style={{ borderRadius: 10 }}
                  prefix={<BankOutlined style={{ color: "#8b0000" }} />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Страна отправителя"
                name="sender_country"
                rules={[{ required: true, message: "Выберите страну" }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите страну отправителя"
                  style={{ borderRadius: 10, border: "1px solid #8b0000" }}
                  loading={loadingCountries}
                  filterOption={filterByLabel}
                  options={countryOptions}
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

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Назначение платежа"
                name="payment_purpose"
                rules={[
                  { required: true, message: "Введите назначение платежа" },
                ]}
              >
                <Input.TextArea
                  placeholder="Введите назначение платежа"
                  style={{ borderRadius: 10 }}
                  rows={3}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentOrders;