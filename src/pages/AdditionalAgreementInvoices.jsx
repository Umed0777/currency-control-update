import { useEffect, useState } from "react";
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
  Modal,
  Form,
  Input,
  Row,
  Col,
  DatePicker,
  Select,
  Upload,
  Popconfirm,
  Divider,
  InputNumber,
  Tabs,
} from "antd";

import {
  FileTextOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  BankOutlined,
  GlobalOutlined,
  HistoryOutlined,
  FileDoneOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseOutlined,
  CheckOutlined,
  InboxOutlined,
  DollarOutlined,
  NumberOutlined,
  CreditCardOutlined,
  MinusOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import { useInvoiceStore } from "../store/useInvoiceStore";
import { useAuthStore } from "../store/useAuth";
import { searchCurrencies } from "../api/dictionary.service";
import DocumentLink from "./DocumentLink";
import GtdUpdate from "./GtdUpdate";
import PaymentOrders from "./PaymentOrders";

const { Title, Text } = Typography;

const CAN_CREATE = ["admin", "compliance", "operator"];
const CAN_EDIT = ["admin", "compliance", "currency_control"];
const CAN_DELETE = ["admin", "compliance", "currency_control"];

const APPROVAL_STATUS_MAP = {
  pending: { label: "В ожидании", color: "gold" },
  pending_currency_control: {
    label: "На валютном контроле",
    color: "orange",
  },
  pending_compliance: { label: "На комплаенсе", color: "purple" },
  revision: { label: "На доработке", color: "volcano" },
  approved: { label: "Одобрено", color: "green" },
  accepted: { label: "Принято", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
  declined: { label: "Отклонено", color: "red" },
};

const INITIAL_FORM_VALUES = {
  currency: "USD",
  document: [],
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

const AdditionalAgreementInvoices = () => {
  const { id: branchId, companyId, contractId, agreementId } = useParams();
  const navigate = useNavigate();
  const { role } = useAuthStore();

  const normalizedRole = String(role || "").toLowerCase();
  const canCreate = CAN_CREATE.includes(normalizedRole);
  const canEdit = CAN_EDIT.includes(normalizedRole);
  const canDelete = CAN_DELETE.includes(normalizedRole);

  const {
    invoices,
    isLoading,
    error,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    clearError,
  } = useInvoiceStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  // Загрузка инвойсов
  useEffect(() => {
    if (branchId && companyId && contractId && agreementId) {
      fetchInvoices(branchId, companyId, contractId, agreementId);
    }
  }, [branchId, companyId, contractId, agreementId, fetchInvoices]);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError?.();
    }
  }, [error, clearError]);

  useEffect(() => {
    const fetchCurrencies = async () => {
      setLoadingCurrencies(true);
      try {
        const data = await searchCurrencies("");
        setCurrencies(data);
      } catch {
        message.error("Не удалось загрузить список валют");
      } finally {
        setLoadingCurrencies(false);
      }
    };
    fetchCurrencies();
  }, []);

  const openCreateModal = () => {
    setEditingInvoice(null);
    form.resetFields();
    form.setFieldsValue(INITIAL_FORM_VALUES);
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingInvoice(record);
    form.setFieldsValue({
      invoice_number: record.invoice_number || "",
      invoice_date: record.invoice_date ? dayjs(record.invoice_date) : null,
      amount:
        record.amount !== undefined && record.amount !== null
          ? String(record.amount)
          : "",
      currency: record.currency || "USD",
      hs_code: record.hs_code || "",
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
      const formData = new FormData();
      formData.append(
        "invoice_number",
        String(values.invoice_number || "").trim()
      );
      formData.append(
        "invoice_date",
        dayjs(values.invoice_date).format("YYYY-MM-DD")
      );
      formData.append("amount", String(Number(values.amount)));
      formData.append("currency", String(values.currency || ""));
      formData.append("hs_code", String(values.hs_code || "").trim());

      const fileObj = values?.document?.[0]?.originFileObj;
      if (fileObj) {
        formData.append("document", fileObj);
      }

      if (editingInvoice) {
        await updateInvoice(
          branchId, companyId, contractId,
          editingInvoice.id, formData, agreementId
        );
        message.success("Инвойс обновлён");
      } else {
        await createInvoice(
          branchId, companyId, contractId, formData, agreementId
        );
        message.success("Инвойс создан");
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingInvoice(null);

      fetchInvoices(branchId, companyId, contractId, agreementId);
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      const data = err?.response?.data;
      const backendMsg =
        (typeof data?.error === "string" && data.error) ||
        (typeof data?.detail === "string" && data.detail) ||
        (typeof data?.message === "string" && data.message) ||
        null;
      message.error(
        backendMsg ||
          (editingInvoice
            ? "Не удалось обновить инвойс"
            : "Не удалось создать инвойс")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, invoiceId) => {
    e?.stopPropagation?.();
    try {
      await deleteInvoice(
        branchId, companyId, contractId, invoiceId, agreementId
      );
      message.success("Инвойс удалён в корзину");
    } catch {
      message.error("Не удалось удалить инвойс");
    }
  };

  // ============ КОЛОНКИ ТАБЛИЦЫ ИНВОЙСОВ ============
  const columns = [
    {
      title: "Номер инвойса",
      dataIndex: "invoice_number",
      key: "invoice_number",
      width: 160,
      render: (v) => <Text strong>{v || "—"}</Text>,
    },
    {
      title: "Дата инвойса",
      dataIndex: "invoice_date",
      key: "invoice_date",
      width: 140,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      width: 160,
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: "#d946ef", fontSize: 14 }}>
            {formatMoney(v, r.currency)}
          </Text>
          {r.paid_amount !== undefined && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              оплачено: {formatMoney(r.paid_amount, r.currency)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Код ТН ВЭД",
      dataIndex: "hs_code",
      key: "hs_code",
      width: 130,
      align: "center",
      render: (v) => (
        <Tag color="blue" style={{ borderRadius: 8 }}>
          {v || "—"}
        </Tag>
      ),
    },
    {
      title: "Статус",
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
      title: "Документ",
      dataIndex: "document_path",
      key: "document_path",
      width: 280,
      render: (v, record) => (
        <DocumentLink entityType="invoice" entityId={record.id} filePath={v} />
      ),
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
      title: "Действие",
      key: "actions",
      width: 180,
      align: "center",
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
              title="Удалить инвойс?"
              description="Инвойс будет перемещён в корзину."
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
  ];

  // ===== РАСКРЫВАЮЩАЯСЯ СТРОКА: ВКЛАДКИ ГТД + ПП =====
  const expandedRowRender = (invoiceRecord) => {
    return (
      <div style={{ padding: "16px 0" }}>
        <Tabs
          defaultActiveKey="gtd"
          size="middle"
          items={[
            {
              key: "gtd",
              label: (
                <Space>
                  <FileDoneOutlined />
                  <span>ГТД</span>
                </Space>
              ),
              children: (
                <div style={{ paddingTop: 12 }}>
                  <GtdUpdate />
                </div>
              ),
            },
            {
              key: "payment-orders",
              label: (
                <Space>
                  <CreditCardOutlined />
                  <span>Платёжные поручения</span>
                </Space>
              ),
              children: (
                <div style={{ paddingTop: 12 }}>
                  <PaymentOrders />
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  };

  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  return (
    <div>
      {/* Заголовок */}
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
            <FileTextOutlined style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: "#8b0000" }}
            >
              Инвойсы доп. соглашения
            </Title>
            <Space size={10} style={{ marginTop: 4 }} wrap>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Филиал:
              </Text>
              <Tag
                style={{
                  borderRadius: 8,
                  padding: "1px 10px",
                  fontWeight: 600,
                  margin: 0,
                  color: "#8b0000",
                  border: "none",
                }}
              >
                {branchId}
              </Tag>
            </Space>
          </div>
        </Space>

        <Space>
          {canCreate && (
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
              Создать инвойс
            </Button>
          )}
          <Button
            danger
            icon={<ArrowLeftOutlined />}
            onClick={() =>
              navigate(
                `/branches/${branchId}/companies/${companyId}/contracts/${contractId}/additional-agreements`
              )
            }
            style={{ borderRadius: 12, height: 35 }}
          >
            Назад к соглашениям
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
              Список инвойсов
            </Text>
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 10 }}>
              (нажмите на строку, чтобы раскрыть ГТД и ПП)
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
            Всего: {safeInvoices.length}
          </Tag>
        </div>

        <div style={{ padding: 20 }}>
          {isLoading && safeInvoices.length === 0 ? (
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
              dataSource={safeInvoices}
              scroll={{ x: "max-content" }}
              expandable={{
                expandedRowRender,
                expandIcon: ({ expanded, onExpand, record }) => (
                  <Button
                    type="text"
                    icon={expanded ? <MinusOutlined /> : <PlusOutlined />}
                    onClick={(e) => onExpand(record, e)}
                    style={{
                      color: "#8b0000",
                      fontSize: 14,
                      borderRadius: "50%",
                    }}
                  />
                ),
              }}
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
                      <span style={{ color: "#999" }}>Инвойсов пока нет</span>
                    }
                  />
                ),
              }}
            />
          )}
        </div>
      </Card>

      {/* Модалка инвойса */}
      <Modal
        title={
          <span style={{ fontWeight: 700, color: "#8b0000", fontSize: 17 }}>
            {editingInvoice ? "Редактировать инвойс" : "Создать инвойс"}
          </span>
        }
        open={isModalOpen}
        onCancel={() => {
          if (!submitting) {
            setIsModalOpen(false);
            setEditingInvoice(null);
          }
        }}
        afterClose={() => {
          form.resetFields();
          setEditingInvoice(null);
        }}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        forceRender
        width={900}
        style={{ top: 80 }}
        styles={{ body: { maxHeight: "calc(100vh - 180px)" } }}
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
              fontWeight: 600,
            }}
          >
            {editingInvoice ? "Сохранить изменения" : "Создать"}
          </Button>,
          <Button
            key="cancel"
            danger
            icon={<CloseOutlined />}
            disabled={submitting}
            onClick={() => {
              setIsModalOpen(false);
              setEditingInvoice(null);
            }}
            style={{ borderRadius: 10, height: 34 }}
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
                label="Номер инвойса"
                name="invoice_number"
                rules={[{ required: true, message: "Введите номер" }]}
              >
                <Input
                  placeholder="Введите номер инвойса"
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                label="Дата инвойса"
                name="invoice_date"
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
            <Col span={10}>
              <Form.Item
                label="Сумма"
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
            <Col span={10}>
              <Form.Item
                label="Валюта"
                name="currency"
                rules={[{ required: true, message: "Выберите валюту" }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите валюту"
                  style={{ borderRadius: 10, border: "1px solid #8b0000" }}
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

          <Row gutter={16}>
            <Col span={10}>
              <Form.Item label="Код ТН ВЭД (HS CODE)" name="hs_code">
                <Input
                  placeholder="Введите код ТН ВЭД"
                  style={{ borderRadius: 10 }}
                  prefix={<GlobalOutlined style={{ color: "#8b0000" }} />}
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
            <Col span={10}>
              <Form.Item
                label={
                  editingInvoice
                    ? "Загрузить новый документ (опционально)"
                    : "Загрузить документ (PDF)"
                }
                name="document"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={
                  editingInvoice
                    ? []
                    : [{ required: true, message: "Загрузите документ" }]
                }
                extra={
                  editingInvoice && editingInvoice.document_path ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Текущий файл:{" "}
                      <Text code style={{ fontSize: 11 }}>
                        {String(editingInvoice.document_path)
                          .split(/[\\/]/)
                          .pop()}
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
                    Поддерживается PDF
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

export default AdditionalAgreementInvoices;