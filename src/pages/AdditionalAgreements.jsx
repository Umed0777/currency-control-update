import { useEffect, useMemo, useState } from "react";
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
  DollarOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  HistoryOutlined,
  InboxOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import { useAdditionalAgreementsStore } from "../store/useAdditionalAgreementsStore";
import { useAuthStore } from "../store/useAuth";
import { useDocPermissions } from "../store/useDocPermissions";
import { searchCurrencies } from "../api/dictionary.service";
// Тот же компонент, что используется для контрактов, инвойсов, ГТД и актов.
// Он сам открывает файл через API (с токеном), поэтому 404 не возникает.
import DocumentLink from "../pages/DocumentLink";

const { Title, Text } = Typography;

const RED = "#8b0000";
const MAX_FILE_SIZE_MB = 100;

// ==================== ФОРМАТТЕРЫ ====================
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

// ==================== ХЕЛПЕРЫ ====================
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

const filterByLabel = (input, option) =>
  String(option?.label || "")
    .toLowerCase()
    .includes(String(input || "").toLowerCase());

const getFileName = (path) => String(path || "").split(/[\\/]/).pop();

// Путь к файлу: как и у остальных сущностей, бэкенд отдаёт document_path
const getRecordDocPath = (record) => {
  const path =
    record?.document_path || record?.document_url || record?.document;
  return typeof path === "string" && path ? path : null;
};

// Чистый текст ошибки (без {"error": ...})
const cleanErrorText = (value) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    const s = value.trim();
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        return cleanErrorText(JSON.parse(s)) || s;
      } catch {
        return s;
      }
    }
    return s;
  }

  if (Array.isArray(value)) {
    return value.map(cleanErrorText).filter(Boolean).join("; ");
  }

  if (typeof value === "object") {
    const direct = value.error ?? value.detail ?? value.message;
    if (direct !== undefined && direct !== null) {
      return cleanErrorText(direct);
    }
    return Object.values(value).map(cleanErrorText).filter(Boolean).join("; ");
  }

  return String(value);
};

export const AdditionalAgreements = () => {
  const { id: branchId, companyId, contractId } = useParams();
  const navigate = useNavigate();

  // ===== STORE =====
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

  const { user } = useAuthStore();

  const [activeBranchId, setActiveBranchId] = useState(branchId);

  // синхронизация, если параметр маршрута изменился
  useEffect(() => {
    setActiveBranchId(branchId);
  }, [branchId]);

  // ===== STATE =====
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [editingAgreement, setEditingAgreement] = useState(null);

  // ===== СПРАВОЧНИКИ =====
  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  // ===== ПРАВА =====
  const perms = useDocPermissions();
  const canCreate = perms.create;
  const canEdit = perms.edit;
  const canDelete = perms.del;

  const safeAgreements = Array.isArray(agreements) ? agreements : [];

  const currencyOptions = useMemo(() => {
    const options = buildCurrencyOptions(currencies);
    // если валюта редактируемой записи отсутствует в справочнике — добавляем,
    // иначе Select покажет пустое значение
    const cur = editingAgreement?.currency;
    if (cur && !options.some((o) => o.value === String(cur))) {
      options.push({ value: String(cur), label: String(cur) });
    }
    return options;
  }, [currencies, editingAgreement]);

  // ===== ЭФФЕКТЫ =====
  useEffect(() => {
    if (activeBranchId && companyId && contractId) {
      fetchAgreements(activeBranchId, companyId, contractId);
    }
  }, [activeBranchId, companyId, contractId, fetchAgreements]);

  useEffect(() => {
    if (error) {
      message.error({
        content: cleanErrorText(error) || "Произошла ошибка",
        key: "agreements-error",
      });
      clearError?.();
    }
  }, [error, clearError]);

  useEffect(() => {
    const loadCurrencies = async () => {
      setLoadingCurrencies(true);
      try {
        const data = await searchCurrencies("");
        setCurrencies(toArray(data));
      } catch (err) {
        console.error("Ошибка загрузки валют:", err);
      } finally {
        setLoadingCurrencies(false);
      }
    };
    loadCurrencies();
  }, []);

  // ===== АВТОР =====
  const getAuthor = (record) => {
    const creator = record?.creator || null;
    const isMe = record?.created_by === user?.login;
    const rawLastName =
      creator?.last_name || record?.last_name || (isMe ? user?.last_name : null);
    const rawFirstName =
      creator?.first_name ||
      record?.first_name ||
      (isMe ? user?.first_name : null);
    const login = creator?.login || record?.login || record?.created_by || null;
    const email =
      creator?.email || record?.email || (isMe ? user?.email : null);

    const fullName = [rawFirstName, rawLastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return { fullName, login, email };
  };

  // ===== CRUD =====
  const openCreateModal = () => {
    if (!canCreate) {
      message.warning("У вас нет прав на создание");
      return;
    }
    setEditingAgreement(null);
    form.resetFields();
    form.setFieldsValue({
      branch_id: activeBranchId,
      document: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    if (!canEdit) {
      message.warning("У вас нет прав на редактирование");
      return;
    }
    setEditingAgreement(record);
    form.resetFields();
    form.setFieldsValue({
      branch_id: record.branch_id || activeBranchId,
      agreement_number: record.agreement_number,
      agreement_date: record.agreement_date
        ? dayjs(record.agreement_date)
        : null,
      amount:
        record.amount !== undefined && record.amount !== null
          ? String(record.amount)
          : "",
      currency: record.currency ? String(record.currency) : undefined,
      document: [],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (editingAgreement ? !canEdit : !canCreate) {
      message.warning(
        editingAgreement
          ? "У вас нет прав на редактирование"
          : "У вас нет прав на создание",
      );
      return;
    }

    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      const effectiveBranchId = values.branch_id || activeBranchId;

      // Бэкенд (Swagger): multipart/form-data с полями
      // agreement_number, agreement_date, currency, amount, document
      const payload = new FormData();
      payload.append("agreement_number", values.agreement_number?.trim() || "");
      payload.append(
        "agreement_date",
        values.agreement_date?.format("YYYY-MM-DD") || "",
      );
      payload.append("currency", values.currency || "USD");
      payload.append(
        "amount",
        String(values.amount || "0")
          .replace(/\s/g, "")
          .replace(",", "."),
      );

      const file = values.document?.[0]?.originFileObj;
      if (file) {
        payload.append("document", file, file.name);
      }

      if (editingAgreement) {
        await updateAgreement(
          effectiveBranchId,
          companyId,
          contractId,
          editingAgreement.id,
          payload,
        );
        message.success("Доп. соглашение обновлено");
      } else {
        await createAgreement(
          effectiveBranchId,
          companyId,
          contractId,
          payload,
        );
        message.success("Доп. соглашение создано");
      }

      if (effectiveBranchId !== activeBranchId) {
        setActiveBranchId(effectiveBranchId);
      } else {
        fetchAgreements(effectiveBranchId, companyId, contractId);
      }
      setIsModalOpen(false);
    } catch (err) {
      // ошибку показывает useEffect через store.error
      console.error("Ошибка сохранения:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (agreementId) => {
    if (!canDelete) {
      message.warning("У вас нет прав на удаление");
      return;
    }
    try {
      await deleteAgreement(activeBranchId, companyId, contractId, agreementId);
      message.success("Доп. соглашение удалено в корзину");
    } catch (err) {
      console.error("Ошибка удаления:", err);
    }
  };

  // ===== UPLOAD =====
  const beforeUpload = (file) => {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      message.error("Можно загружать только PDF");
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
      message.error(`Размер файла не должен превышать ${MAX_FILE_SIZE_MB} МБ`);
      return Upload.LIST_IGNORE;
    }
    return false; // не загружать автоматически
  };

  // ===== КОЛОНКИ =====
  const agreementColumns = [
    ...(canEdit || canDelete
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 140,
            align: "center",
            render: (_, record) => (
              <Space size={4}>
                {canEdit && (
                  <Tooltip title="Редактировать">
                    <Button
                      type="text"
                      icon={<EditOutlined style={{ color: RED }} />}
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
                    onConfirm={() => handleDelete(record.id)}
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
    {
      title: "Номер доп. соглашения",
      dataIndex: "agreement_number",
      key: "agreement_number",
      width: 220,
      render: (v) => <Text strong>{v || "—"}</Text>,
    },
    {
      title: "Сумма доп. соглашения",
      dataIndex: "amount",
      key: "amount",
      width: 220,
      render: (v, r) => (
        <Text strong style={{ color: RED, fontSize: 14 }}>
          {formatMoney(v, r.currency)}
        </Text>
      ),
    },
    {
      title: "Валюта",
      dataIndex: "currency",
      key: "currency",
      width: 100,
      align: "center",
      render: (v) => (
        <Tag
          style={{
            borderRadius: 8,
            fontWeight: 700,
            background: RED,
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
      title: "Дата доп. соглашения",
      dataIndex: "agreement_date",
      key: "agreement_date",
      width: 200,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: RED, fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      // Документ открывается через DocumentLink — так же, как у контрактов,
      // инвойсов, ГТД и актов.
      title: "Документ",
      key: "document",
      width: 320,
      render: (_, record) => {
        const path = getRecordDocPath(record);
        if (!path) {
          return <Text type="secondary">—</Text>;
        }
        return (
          <DocumentLink
            entityType="additional_agreement"
            entityId={record.id}
            filePath={path}
          />
        );
      },
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
              style={{ background: RED, fontSize: 10, marginRight: 5 }}
            >
              {String(v || "?")
                .charAt(0)
                .toUpperCase()}
            </Avatar>
            <Text style={{ fontSize: 12 }}>
              {fullName && <Text strong>{fullName}</Text>}
              {login && (
                <Text
                  style={{
                    color: RED,
                    fontFamily: "monospace",
                    fontWeight: 400,
                  }}
                >
                  {fullName ? " • " : ""}
                  {login}
                </Text>
              )}
              {email && (
                <Text style={{ color: RED, fontWeight: 700 }}>
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
          <ClockCircleOutlined style={{ color: RED, fontSize: 11 }} />
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
          <HistoryOutlined style={{ color: RED, fontSize: 11 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(v)}
          </Text>
        </Space>
      ),
    },
  ];

  const currentDocPath = getRecordDocPath(editingAgreement);

  return (
    <div>
      {/* ===== ЗАГОЛОВОК ===== */}
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
            <FileTextOutlined style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: RED }}>
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
                  color: RED,
                  border: "none",
                }}
              >
                {activeBranchId}
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
                background: RED,
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
            onClick={() => navigate(-1)}
            style={{ borderRadius: 12, height: 35 }}
          >
            Назад
          </Button>
        </Space>
      </div>

      {/* ===== ТАБЛИЦА ===== */}
      <Card
        style={{
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          overflow: "hidden",
          marginBottom: 24,
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
              "linear-gradient(90deg, #fff5f5 0%, #ffffff 60%, #faf5ff 100%)",
            borderBottom: "1px solid rgba(139,0,0,0.06)",
          }}
        >
          <Space size={10}>
            <BankOutlined style={{ color: RED, fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: RED }}>
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
              <Spin size="small" style={{ color: "#f00" }} />
            </div>
          ) : (
            <Table
              className="red-table"
              rowKey={(r) => String(r.id)}
              loading={isLoading}
              columns={agreementColumns}
              dataSource={safeAgreements}
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

      {/* ===== МОДАЛКА =====
          Без destroyOnClose: форма должна оставаться смонтированной,
          иначе form.setFieldsValue(...) перед открытием не попадает в поля. */}
      <Modal
        title={
          <span style={{ fontWeight: 700, color: RED, fontSize: 17 }}>
            {editingAgreement
              ? "Редактировать доп. соглашение"
              : "Создать доп. соглашение"}
          </span>
        }
        open={isModalOpen}
        onCancel={() => {
          if (!submitting) closeModal();
        }}
        afterClose={() => {
          form.resetFields();
          setEditingAgreement(null);
        }}
        maskClosable={false}
        keyboard={false}
        forceRender
        width={800}
        style={{ top: 100 }}
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
              background: RED,
              border: "none",
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
            onClick={closeModal}
            style={{ borderRadius: 10, height: 35 }}
          >
            Отмена
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item name="branch_id" hidden>
            <Input />
          </Form.Item>

          <Divider orientation="left" style={{ marginTop: 0 }}>
            <Space>
              <FileTextOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
                Основная информация
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
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
            <Col span={12}>
              <Form.Item
                label="Дата начала доп. соглашения"
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
          </Row>

          <Divider orientation="left">
            <Space>
              <DollarOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
                Финансы
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Сумма доп. соглашения"
                name="amount"
                rules={[
                  { required: true, message: "Введите сумму" },
                  {
                    pattern: /^\d+([.,]\d+)?$/,
                    message: "Введите корректную сумму",
                  },
                ]}
              >
                <Input
                  placeholder="Введите сумму"
                  style={{ borderRadius: 10 }}
                  prefix={<DollarOutlined style={{ color: RED }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Валюта"
                name="currency"
                rules={[{ required: true, message: "Выберите валюту" }]}
              >
                <Select
                 style={{border: '1px solid #8b0000'}}
                  showSearch
                  placeholder="Выберите валюту"
                  loading={loadingCurrencies}
                  filterOption={filterByLabel}
                  options={currencyOptions}
                  notFoundContent={
                    loadingCurrencies ? (
                      <Spin size="small" />
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
              <FileDoneOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
                Документ
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label={
                  editingAgreement
                    ? "Файл документа (.pdf) — загрузите новый, если нужно заменить"
                    : "Файл документа доп. соглашения (.pdf)"
                }
                name="document"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={
                  editingAgreement
                    ? []
                    : [
                        {
                          required: true,
                          type: "array",
                          min: 1,
                          message: "Загрузите документ",
                        },
                      ]
                }
                extra={
                  editingAgreement && currentDocPath ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Текущий файл:{" "}
                      <Text code style={{ fontSize: 11 }}>
                        {getFileName(currentDocPath)}
                      </Text>
                    </Text>
                  ) : null
                }
              >
                <Upload.Dragger
                  beforeUpload={beforeUpload}
                  maxCount={1}
                  accept=".pdf,application/pdf"
                  style={{
                    borderRadius: 12,
                    background: "#fafafa",
                    borderColor: RED,
                  }}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: RED, fontSize: 36 }} />
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
                    Поддерживается только PDF (до {MAX_FILE_SIZE_MB} МБ)
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