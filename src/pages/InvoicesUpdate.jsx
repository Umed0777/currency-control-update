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
  HistoryOutlined,
  InboxOutlined,
  DollarOutlined,
  NumberOutlined,
  CalendarOutlined,
  GlobalOutlined,
  FileDoneOutlined,
  // FileAddOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import { useInvoiceStore } from "../store/useInvoiceStore";
import { useAuthStore } from "../store/useAuth";
import { searchCurrencies } from "../api/dictionary.service";
import DocumentLink from "../pages/DocumentLink";

const { Title, Text } = Typography;

const gradientText = {
  background: "linear-gradient(90deg, #ff4b4b, #d946ef, #8b5cf6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const CAN_CREATE_EDIT = ["admin", "compliance", "currency_control", "operator"];
const CAN_EDIT = ["admin", "compliance", "currency_control"];
const CAN_DELETE = ["admin", "compliance", "currency_control"];

const APPROVAL_STATUS_MAP = {
  pending: { label: "В ожидании", color: "gold" },
  pending_currency_control: { label: "На валютном контроле", color: "orange" },
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

export const InvoicesUpdate = () => {
  const {
    id: branchId,
    companyId,
    contractId,
    agreementId,
  } = useParams();
  const navigate = useNavigate();

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

  const { role, user } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [editingInvoice, setEditingInvoice] = useState(null);

  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  const normalizedRole = String(role || "").toLowerCase();
  const canCreateEdit = CAN_CREATE_EDIT.includes(normalizedRole);
  const canEdit = CAN_EDIT.includes(normalizedRole);
  const canDelete = CAN_DELETE.includes(normalizedRole);
  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  useEffect(() => {
    if (branchId && companyId && contractId) {
      fetchInvoices(branchId, companyId, contractId, agreementId);
    }
  }, [branchId, companyId, contractId, agreementId, fetchInvoices]);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError?.();
    }
  }, [error, clearError]);

  // Загрузка валют
  useEffect(() => {
    const fetchCurrencies = async () => {
      setLoadingCurrencies(true);
      try {
        const data = await searchCurrencies("");
        setCurrencies(data);
      } catch (err) {
        message.error("Не удалось загрузить список валют");
      } finally {
        setLoadingCurrencies(false);
      }
    };
    fetchCurrencies();
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

  // Открытие модалки создания
  const openCreateModal = () => {
    setEditingInvoice(null);
    form.resetFields();
    form.setFieldsValue({ currency: "USD", invoice_date: dayjs() });
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingInvoice(record);
    form.setFieldsValue({
      ...record,
      invoice_date: record.invoice_date ? dayjs(record.invoice_date) : null,
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
          branchId,
          companyId,
          contractId,
          editingInvoice.id,
          formData,
          agreementId
        );
        message.success("Инвойс успешно обновлен");
      } else {
        await createInvoice(
          branchId,
          companyId,
          contractId,
          formData,
          agreementId
        );
        message.success("Инвойс успешно создан");
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingInvoice(null);
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      console.error("Ответ сервера:", err?.response?.data);

      const data = err?.response?.data;

      const serverMsg =
        (typeof data?.error === "string" && data.error) ||
        (typeof data?.detail === "string" && data.detail) ||
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.error?.message === "string" && data.error.message) ||
        (typeof data?.detail?.message === "string" && data.detail.message) ||
        null;

      message.error(
        serverMsg ||
          (editingInvoice
            ? "Не удалось обновить инвойс"
            : "Не удалось создать инвойс")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Удаление
  const handleDelete = async (e, invoiceId) => {
    e?.stopPropagation?.();
    try {
      await deleteInvoice(
        branchId,
        companyId,
        contractId,
        invoiceId,
        agreementId
      );
      message.success("Инвойс удален в корзину");
    } catch (err) {
      message.error("Не удалось удалить инвойс");
    }
  };

  // const handleRowClick = (record) => {
  //   navigate(
  //     `/branches/${branchId}/companies/${companyId}/contracts/${record.id}/invoices`
  //   );
  // };

  const handleOpenGtd = (record) => {
    navigate(
      `/branches/${branchId}/companies/${companyId}/contracts/${contractId}/invoices/${record.id}/gtd`
    );
  };
const handleOpenPaymentOrders = (record) => {
  navigate(
    `/branches/${branchId}/companies/${companyId}/contracts/${contractId}/invoices/${record.id}/payment-orders`
  );
};
  // const handleOpenAdditionalAgreements = () => {
  //   navigate(
  //     `/branches/${branchId}/companies/${companyId}/contracts/${contractId}/additional-agreements`
  //   );
  // };

  const columns = [
    {
      title: "Номер инвойса",
      dataIndex: "invoice_number",
      key: "invoice_number",
      width: 150,
      render: (v) => <Text strong>{v || "—"}</Text>,
    },
    {
      title: "Дата инвойса",
      dataIndex: "invoice_date",
      key: "invoice_date",
      width: 130,
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
      width: 120,
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
      width: 320,
      render: (v, record) => (
        <DocumentLink
          entityType="invoice"
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
  width: 220,
  align: "right",
  render: (_, record) => (
    <Space size={4}>
      <Tooltip title="ГТД">
        <Button
          type="text"
          icon={<FileDoneOutlined style={{ color: "#8b0000" }} />}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenGtd(record);
          }}
        />
      </Tooltip>
      {/* <Tooltip title="Дополнительные соглашения">
        <Button
          type="text"
          icon={<FileAddOutlined style={{ color: "#d946ef" }} />}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenAdditionalAgreements();
          }}
        />
      </Tooltip> */}
      <Tooltip title="Платёжные поручения">
        <Button
          type="text"
          icon={<CreditCardOutlined style={{ color: "#8b0000" }} />}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenPaymentOrders(record);
          }}
        />
      </Tooltip>

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
          description="Инвойс будет перемещен в корзину."
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
}
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
              // background:
              //   "linear-gradient(135deg, #ff4b4b 0%, #d946ef 50%, #8b5cf6 100%)",
              background: '#8b0000',
              boxShadow: "0 10px 24px rgba(217,70,239,0.28)",
              flexShrink: 0,
            }}
          >
            <FileTextOutlined style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: '#8b0000', }}
            >
              {agreementId
                ? "Инвойсы доп. соглашения"
                : "Инвойсы контракта"}
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
                }}
              >
                {branchId}
              </Tag>
              {agreementId && (
                <>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Доп. соглашение:
                  </Text>
                  <Tag
                    color="purple"
                    style={{
                      borderRadius: 8,
                      padding: "1px 10px",
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    ID {agreementId}
                  </Tag>
                </>
              )}
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
                // background:
                //   "linear-gradient(90deg, #ff4b4b 0%, #d946ef 100%)",
                background: '#8b0000',
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
            <BankOutlined style={{ color: "#e60026", fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: '#8b0000' }}>
              Список инвойсов
            </Text>
          </Space>
          <Tag
            color="red"
            style={{
              borderRadius: 8,
              padding: "2px 12px",
              fontWeight: 600,
              fontSize: 13,
              color: '#8b0000',
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
              // onRow={(record) => ({
              //   onClick: () => handleRowClick(record),
              //   style: { cursor: "pointer" },
              // })}
              rowKey={(r) => String(r.id ?? Math.random())}
              loading={isLoading}
              columns={columns}
              dataSource={safeInvoices}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                // showTotal: (total) => (
                //   <span
                //     style={{
                //       color: "#ff4d4f",
                //       fontWeight: 600,
                //       position: "relative",
                //       top: 2,
                //     }}
                //   >
                //     Всего инвойсов: {total}
                //   </span>
                // ),
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

      <Modal
        title={
          <Space>
            <span style={{ fontWeight: 700, color: '#8b0000', fontSize: 17 }}>
              {editingInvoice ? "Редактировать инвойс" : "Создать новый инвойс"}
            </span>
          </Space>
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
        width={800}
        style={{ top: 80 }}
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
              boxShadow: "0 6px 16px rgba(217,70,239,0.35)",
              fontWeight: 600,
            }}
          >
            {editingInvoice ? "Сохранить изменения" : "Сохранить"}
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
              <Text strong style={{color: '#8b0000'}}>
                Основная информация
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Номер инвойса"
                name="invoice_number"
                rules={[{ required: true, message: "Введите номер инвойса" }]}
              >
                <Input
                  placeholder="Введите номер инвойса"
                  style={{ borderRadius: 10 }}
                  // prefix={<NumberOutlined style={{ color: "#8b5cf6" }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Дата инвойса"
                name="invoice_date"
                rules={[{ required: true, message: "Выберите дату инвойса" }]}
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
            <Col span={12}>
              <Form.Item
                label="Сумма инвойса"
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
                label="Валюта инвойса"
                name="currency"
                rules={[{ required: true, message: "Выберите валюту" }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите валюту"
                  style={{ borderRadius: 10, border: '1px solid #8b0000' }}
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
            <Col span={12}>
              <Form.Item
                label="Код ТН ВЭД (HS CODE)"
                name="hs_code"
                rules={[{ required: true, message: "Введите код ТН ВЭД" }]}
              >
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
              <Text strong style={{color: '#8b0000'}}>
                Документ
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                label={
                  editingInvoice
                    ? "Загрузить новый PDF (опционально)"
                    : "Загрузить PDF (обязательно)"
                }
                name="document"
                valuePropName="fileList"
                getValueFromEvent={(e) =>
                  Array.isArray(e) ? e : e?.fileList
                }
                rules={
                  editingInvoice
                    ? []
                    : [{ required: true, message: "Загрузите PDF документ" }]
                }
                extra={
                  editingInvoice?.document_path ? (
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
                    <InboxOutlined
                      style={{ color: "#8b0000", fontSize: 36 }}
                    />
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
                    Поддерживаются только файлы PDF
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

export default InvoicesUpdate;