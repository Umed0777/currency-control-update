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
  InputNumber,
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
  GlobalOutlined,
  HistoryOutlined,
  InboxOutlined,
  FieldTimeOutlined,
  RiseOutlined,
  SendOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import { useGtdStore } from "../store/useGtdStore";
import { useAuthStore } from "../store/useAuth";
import { searchCurrencies, searchCountries } from "../api/dictionary.service";
import DocumentLink from "./DocumentLink";

const { Title, Text } = Typography;

const RED = "#8b0000";

const CAN_CREATE_EDIT = ["admin", "compliance", "currency_control", "operator"];
const CAN_EDIT = ["admin", "compliance", "currency_control"];
const CAN_DELETE = ["admin", "compliance", "currency_control"];
const CAN_EXTEND = ["admin", "compliance", "currency_control", "operator"];

const APPROVAL_STATUS_MAP = {
  pending: { label: "В ожидании", color: "gold" },
  pending_currency_control: { label: "На валютном контроле", color: "orange" },
  approved: { label: "Одобрено", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
};

const EXTENSION_STATUS_MAP = {
  pending: { label: "В ожидании", color: "gold" },
  pending_currency_control: { label: "На валютном контроле", color: "orange" },
  approved: { label: "Одобрено", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
};

const DOCUMENT_TYPE_MAP = {
  gtd: { label: "ГТД", color: "purple" },
  act: { label: "Акт", color: "blue" },
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

export const GtdUpdate = () => {
  const { id: branchId, companyId, contractId, invoiceId } = useParams();
  const navigate = useNavigate();

  const {
    gtdList,
    isLoading,
    error,
    fetchGtd,
    fetchGtdByInvoice,
    createGtd,
    updateGtd,
    deleteGtd,
    extendGtd,
    fetchExtensionHistory,
    extensionHistory,
    extensionHistoryLoading,
    extensionSubmitting,
    clearExtensionHistory,
    clearError,
  } = useGtdStore();

  const { role, user } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [editingGtd, setEditingGtd] = useState(null);
  const [extendingGtd, setExtendingGtd] = useState(null);
  const [historyGtd, setHistoryGtd] = useState(null);

  const [form] = Form.useForm();
  const [extendForm] = Form.useForm();

  const [currencies, setCurrencies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const normalizedRole = String(role || "").toLowerCase();
  const canCreateEdit = CAN_CREATE_EDIT.includes(normalizedRole);
  const canEdit = CAN_EDIT.includes(normalizedRole);
  const canDelete = CAN_DELETE.includes(normalizedRole);
  const canExtend = CAN_EXTEND.includes(normalizedRole);

  const safeGtd = Array.isArray(gtdList) ? gtdList : [];
  const safeHistory = Array.isArray(extensionHistory) ? extensionHistory : [];

  const currencyOptions = buildCurrencyOptions(currencies);
  const countryOptions = buildCountryOptions(countries);

  useEffect(() => {
    if (!branchId || !companyId || !contractId) return;
    if (invoiceId) {
      fetchGtdByInvoice(branchId, companyId, contractId, invoiceId);
    } else {
      fetchGtd(branchId, companyId, contractId);
    }
  }, [branchId, companyId, contractId, invoiceId, fetchGtd, fetchGtdByInvoice]);

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
    const surname = rawFirstName || "";
    const name = rawLastName || "";
    const fullName = [surname, name].filter(Boolean).join(" ").trim();
    return { fullName, login, email };
  };

  const getPersonName = (person) => {
    if (!person) return "";
    const surname = person.first_name || "";
    const name = person.last_name || "";
    return [surname, name].filter(Boolean).join(" ").trim();
  };

  const openCreateModal = () => {
    setEditingGtd(null);
    form.resetFields();
    form.setFieldsValue({
      gtd_currency: "USD",
      document_type: "gtd",
      gtd_date: dayjs(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingGtd(record);
    form.setFieldsValue({
      ...record,
      gtd_date: record.gtd_date ? dayjs(record.gtd_date) : null,
      gtd_amount:
        record.gtd_amount !== undefined && record.gtd_amount !== null
          ? String(record.gtd_amount)
          : "",
      sender_name: record.sender_name || "",
      sender_bank: record.sender_bank || "",
      sender_country: record.sender_country || "",
      document: [],
    });
    setIsModalOpen(true);
  };

  const openExtendModal = (record) => {
    if (!invoiceId) {
      message.warning("Продление доступно только со страницы инвойса");
      return;
    }
    setExtendingGtd(record);
    extendForm.resetFields();
    extendForm.setFieldsValue({
      requested_deadline: record.delivery_deadline
        ? dayjs(record.delivery_deadline).add(30, "day")
        : dayjs().add(30, "day"),
      document: [],
    });
    setIsExtendOpen(true);
  };

  const handleExtendSubmit = async () => {
    if (extensionSubmitting) return;
    if (!extendingGtd) return;
    if (!invoiceId) {
      message.warning("Продление доступно только со страницы инвойса");
      return;
    }
    let values;
    try {
      values = await extendForm.validateFields();
    } catch {
      return;
    }
    const file = values.document?.[0]?.originFileObj;
    if (!file) {
      message.error("Прикрепите PDF документ-обоснование");
      return;
    }
    const requestedDeadline = values.requested_deadline?.format("YYYY-MM-DD");
    if (!requestedDeadline) {
      message.error("Выберите новую дату срока");
      return;
    }
    try {
      await extendGtd({
        branchId,
        companyId,
        contractId,
        invoiceId,
        gtdId: extendingGtd.id,
        requestedDeadline,
        document: file,
      });
      message.success("Заявка на продление отправлена");
      setIsExtendOpen(false);
      setExtendingGtd(null);
      extendForm.resetFields();
      fetchGtdByInvoice(branchId, companyId, contractId, invoiceId);
    } catch (e) {
      message.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Не удалось подать заявку",
      );
    }
  };

  const openHistoryModal = async (record) => {
    if (!invoiceId) {
      message.warning("История доступна только со страницы инвойса");
      return;
    }
    setHistoryGtd(record);
    setIsHistoryOpen(true);
    await fetchExtensionHistory({
      branchId,
      companyId,
      contractId,
      invoiceId,
      gtdId: record.id,
    });
  };

  const closeHistoryModal = () => {
    setIsHistoryOpen(false);
    setHistoryGtd(null);
    clearExtensionHistory();
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
        gtd_number: values.gtd_number?.trim() || "",
        gtd_date: values.gtd_date?.format("YYYY-MM-DD") || null,
        gtd_amount: values.gtd_amount
          ? Number(String(values.gtd_amount).replace(/\s|,/g, ""))
          : 0,
        gtd_currency: values.gtd_currency || "USD",
        hs_code: values.hs_code?.trim() || "",
        destination_country: values.destination_country || "",
        document_type: values.document_type || "gtd",
        invoice_id: invoiceId || values.invoice_id || null,
        sender_name: values.sender_name?.trim() || "",
        sender_bank: values.sender_bank?.trim() || "",
        sender_country: values.sender_country || "",
        document: values.document?.[0]?.originFileObj || null,
      };

      if (editingGtd) {
        await updateGtd(
          branchId,
          companyId,
          contractId,
          editingGtd.id,
          payload,
        );
        message.success("ГТД успешно обновлён");
      } else {
        await createGtd(branchId, companyId, contractId, invoiceId, payload);
        message.success("ГТД успешно создан");
      }

      if (invoiceId) {
        fetchGtdByInvoice(branchId, companyId, contractId, invoiceId);
      } else {
        fetchGtd(branchId, companyId, contractId);
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingGtd(null);
    } catch (err) {
      console.error("Ошибка сохранения ГТД:", err);
      const backendMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        null;
      message.error(
        backendMsg ||
          (editingGtd ? "Не удалось обновить ГТД" : "Не удалось создать ГТД"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, gtdId) => {
    e?.stopPropagation?.();
    try {
      await deleteGtd(branchId, companyId, contractId, gtdId);
      message.success("ГТД удалён в корзину");
    } catch {
      message.error("Не удалось удалить ГТД");
    }
  };

  // ============================================================
  //  КОЛОНКИ ТАБЛИЦЫ ГТД
  // ============================================================
  const columns = [
    {
      title: "Номер ГТД",
      dataIndex: "gtd_number",
      key: "gtd_number",
      width: 160,
      render: (v) => <Text strong>{v || "—"}</Text>,
    },
    {
      title: "Тип документа",
      dataIndex: "document_type",
      key: "document_type",
      width: 140,
      render: (v) => {
        const info = DOCUMENT_TYPE_MAP[v] || {
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
      title: "Дата ГТД",
      dataIndex: "gtd_date",
      key: "gtd_date",
      width: 130,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: RED, fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Сумма",
      dataIndex: "gtd_amount",
      key: "gtd_amount",
      width: 150,
      render: (v, r) => (
        <Text strong style={{ color: "#d946ef", fontSize: 14 }}>
          {formatMoney(v, r.gtd_currency)}
        </Text>
      ),
    },
    {
      title: "Валюта",
      dataIndex: "gtd_currency",
      key: "gtd_currency",
      width: 90,
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
      title: "Страна поступления товара",
      dataIndex: "destination_country",
      key: "destination_country",
      width: 240,
      render: (v) => (
        <Space size={6}>
          <GlobalOutlined style={{ color: RED, fontSize: 12 }} />
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
            <SendOutlined style={{ color: RED, fontSize: 12 }} />
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
            <BankOutlined style={{ color: RED, fontSize: 12 }} />
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
          <GlobalOutlined style={{ color: RED, fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "approval_status",
      key: "approval_status",
      width: 160,
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
      title: "Срок поставки",
      dataIndex: "delivery_deadline",
      key: "delivery_deadline",
      width: 140,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: RED, fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Документ",
      dataIndex: "document_path",
      key: "document_path",
      width: 340,
      render: (v, record) => (
        <DocumentLink entityType="gtd" entityId={record.id} filePath={v} />
      ),
    },
    {
      title: "Создал",
      dataIndex: "created_by",
      key: "created_by",
      width: 280,
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
                background: RED,
                fontSize: 10,
              }}
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
                    color: "#d9363e",
                    fontFamily: "monospace",
                    fontWeight: 500,
                  }}
                >
                  {fullName ? " • " : ""}
                  {login}
                </Text>
              )}
              {email && (
                <Text style={{ color: "#ff4b4b", fontWeight: 600 }}>
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
      width: 150,
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
      width: 150,
      render: (v) => (
        <Space size={4}>
          <HistoryOutlined style={{ color: "#d946ef", fontSize: 11 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(v)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Действие",
      key: "actions",
      width: 200,
      align: "right",
      render: (_, record) => (
        <Space size={4}>
          {canExtend && (
            <Tooltip title="Продлить срок ГТД">
              <Button
                type="text"
                icon={<FieldTimeOutlined style={{ color: "#fa8c16" }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  openExtendModal(record);
                }}
              />
            </Tooltip>
          )}

          <Tooltip title="История продлений">
            <Button
              type="text"
              icon={<HistoryOutlined style={{ color: "#13c2c2" }} />}
              onClick={(e) => {
                e.stopPropagation();
                openHistoryModal(record);
              }}
            />
          </Tooltip>

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
              title="Удалить ГТД?"
              description="ГТД будет перемещён в корзину."
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

  // ============================================================
  //  КОЛОНКИ ИСТОРИИ ПРОДЛЕНИЙ
  // ============================================================
  const historyColumns = [
    {
      title: "Текущий дедлайн",
      dataIndex: "current_deadline",
      key: "current_deadline",
      width: 150,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: RED, fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Запрошенный дедлайн",
      dataIndex: "requested_deadline",
      key: "requested_deadline",
      width: 170,
      render: (v) => (
        <Space size={4}>
          <RiseOutlined style={{ color: "#52c41a", fontSize: 12 }} />
          <Text strong style={{ fontSize: 13 }}>
            {formatDateShort(v)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (v) => {
        const info = EXTENSION_STATUS_MAP[v] || {
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
      width: 240,
      render: (v, record) => (
        <DocumentLink
          entityType="gtd-extension"
          entityId={record.id}
          filePath={v}
        />
      ),
    },
    {
      title: "Запросил",
      dataIndex: "created_by",
      key: "created_by",
      width: 200,
      render: (_, record) => {
        const name = getPersonName(record.creator);
        const login = record.creator?.login || record.created_by;
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12, fontWeight: 600 }}>{name || "—"}</Text>
            <Text style={{ fontSize: 11, color: "#d9363e" }}>
              {login || ""}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Дата заявки",
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
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
      title: "Рассмотрел",
      dataIndex: "reviewed_by",
      key: "reviewed_by",
      width: 200,
      render: (_, record) => {
        const name = getPersonName(record.reviewer);
        const login = record.reviewer?.login || record.reviewed_by;
        if (!name && !login) return <Text type="secondary">—</Text>;
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12, fontWeight: 600 }}>{name || "—"}</Text>
            <Text style={{ fontSize: 11, color: "#d9363e" }}>
              {login || ""}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Дата рассмотрения",
      dataIndex: "reviewed_at",
      key: "reviewed_at",
      width: 170,
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
      title: "Комментарий",
      dataIndex: "comment",
      key: "comment",
      width: 240,
      render: (v) => (
        <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: v }}>
          {v || "—"}
        </Text>
      ),
    },
  ];

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
              boxShadow: "0 10px 24px rgba(217,70,239,0.28)",
              flexShrink: 0,
            }}
          >
            <FileTextOutlined style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: RED }}>
              ГТД
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
                  color: RED,
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
                background: RED,
                border: "none",
                boxShadow: "0 6px 16px rgba(139,0,0,0.35)",
                fontWeight: 600,
              }}
            >
              Добавить ГТД
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

      {/* ===== КАРТОЧКА ===== */}
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
            <BankOutlined style={{ color: RED, fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: RED }}>
              Список ГТД
            </Text>
          </Space>
          <Tag
            color="red"
            style={{
              borderRadius: 8,
              padding: "2px 12px",
              fontWeight: 600,
              fontSize: 13,
              color: RED,
            }}
          >
            Всего: {safeGtd.length}
          </Tag>
        </div>

        <div style={{ padding: 20 }}>
          {isLoading && safeGtd.length === 0 ? (
            <div
              style={{
                minHeight: 300,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Spin size="middle" />
            </div>
          ) : (
            <Table
              className="red-table"
              rowKey={(r) => String(r.id ?? Math.random())}
              loading={isLoading}
              columns={columns}
              dataSource={safeGtd}
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
                      <span style={{ color: "#999" }}>ГТД пока нет</span>
                    }
                  />
                ),
              }}
            />
          )}
        </div>
      </Card>

      {/* ===== МОДАЛКА ГТД ===== */}
      <Modal
        title={
          <span style={{ fontWeight: 700, color: RED, fontSize: 17 }}>
            {editingGtd ? "Редактировать ГТД" : "Создать ГТД"}
          </span>
        }
        open={isModalOpen}
        onCancel={() => {
          if (!submitting) {
            setIsModalOpen(false);
            setEditingGtd(null);
          }
        }}
        afterClose={() => {
          form.resetFields();
          setEditingGtd(null);
        }}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        forceRender
        width={900}
        style={{ top: 60 }}
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
              background: RED,
              border: "none",
              boxShadow: "0 6px 16px rgba(139,0,0,0.35)",
              fontWeight: 600,
            }}
          >
            {editingGtd ? "Сохранить изменения" : "Сохранить"}
          </Button>,
          <Button
            key="cancel"
            danger
            icon={<CloseOutlined />}
            disabled={submitting}
            onClick={() => {
              setIsModalOpen(false);
              setEditingGtd(null);
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
              <FileTextOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
                Основная информация
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Номер ГТД"
                name="gtd_number"
                rules={[{ required: true, message: "Введите номер ГТД" }]}
              >
                <Input
                  placeholder="Введите номер ГТД"
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Дата ГТД"
                name="gtd_date"
                rules={[{ required: true, message: "Выберите дату ГТД" }]}
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
                label="Сумма ГТД"
                name="gtd_amount"
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
                  prefix={<DollarOutlined style={{ color: RED }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Валюта ГТД"
                name="gtd_currency"
                rules={[{ required: true, message: "Выберите валюту" }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите валюту"
                  style={{ borderRadius: 10 }}
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Код ТН ВЭД (HS CODE)" name="hs_code">
                <Input
                  placeholder="Введите код ТН ВЭД"
                  style={{ borderRadius: 10 }}
                  prefix={<GlobalOutlined style={{ color: RED }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Страна поступления товара"
                name="destination_country"
                rules={[{ required: true, message: "Выберите страну" }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите страну"
                  style={{ borderRadius: 10 }}
                  loading={loadingCountries}
                  filterOption={filterByLabel}
                  options={countryOptions}
                  notFoundContent={
                    loadingCountries ? (
                      <Spin size="small" />
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
                label="Тип документа"
                name="document_type"
                rules={[{ required: true, message: "Выберите тип" }]}
              >
                <Select
                  style={{ borderRadius: 10 }}
                  options={[
                    { value: "gtd", label: "ГТД" },
                    { value: "act", label: "Акт" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">
            <Space>
              <SendOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
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
                  prefix={<SendOutlined style={{ color: RED }} />}
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
                  prefix={<BankOutlined style={{ color: RED }} />}
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
                  style={{ borderRadius: 10 }}
                  loading={loadingCountries}
                  filterOption={filterByLabel}
                  options={countryOptions}
                  notFoundContent={
                    loadingCountries ? (
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
            <Col span={12}>
              <Form.Item
                label={
                  editingGtd
                    ? "Загрузить новый PDF (опционально)"
                    : "Загрузить PDF (обязательно)"
                }
                name="document"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={
                  editingGtd
                    ? []
                    : [{ required: true, message: "Загрузите PDF документ" }]
                }
                extra={
                  editingGtd?.document_path ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Текущий файл:{" "}
                      <Text code style={{ fontSize: 11 }}>
                        {String(editingGtd.document_path).split(/[\\/]/).pop()}
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
                    Поддерживается только PDF
                  </p>
                </Upload.Dragger>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ===== МОДАЛКА ПРОДЛЕНИЯ ===== */}
      <Modal
        title={
          <Space size={10}>
            <HistoryOutlined style={{ color: "#8b0000", fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: "#8b0000", fontSize: 17 }}>
              История продлений срока
            </span>
            {historyGtd?.gtd_number && (
              <Tag
                style={{
                  borderRadius: 8,
                  background: "#8b0000",
                  color: "#fff",
                  border: "none",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  padding: "2px 12px",
                }}
              >
                {historyGtd.gtd_number}
              </Tag>
            )}
          </Space>
        }
        open={isHistoryOpen}
        onCancel={closeHistoryModal}
        footer={[
          <Button
            key="close"
            danger
            icon={<CloseOutlined />}
            onClick={closeHistoryModal}
            style={{
              borderRadius: 10,
              height: 35,
              fontWeight: 600,
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            Закрыть
          </Button>,
        ]}
        width={1300}
        style={{ top: 40 }}
        styles={{ body: { maxHeight: "72vh", overflowY: "auto" } }}
        destroyOnClose
        maskClosable
        keyboard
      >
        {extensionHistoryLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin size="middle" />
          </div>
        ) : safeHistory.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: "#999" }}>
                Заявок на продление пока нет
              </span>
            }
            style={{ padding: "40px 0" }}
          />
        ) : (
          <Table
          className="red-table"
            rowKey={(r) => String(r.id ?? Math.random())}
            columns={historyColumns}
            dataSource={safeHistory}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              style: { marginTop: 16 },
            }}
            size="middle"
            rowClassName={(_, index) =>
              index % 2 === 0 ? "even-row" : "odd-row"
            }
            style={{
              borderRadius: 12,
              overflow: "hidden",
            }}
          />
        )}
      </Modal>

      {/* ===== МОДАЛКА ИСТОРИИ ===== */}
      <Modal
        title={
          <Space size={10}>
            <HistoryOutlined style={{ color: RED, fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: RED }}>
              История продлений срока
            </span>
            {historyGtd?.gtd_number && (
              <Tag
                style={{
                  borderRadius: 8,
                  background: RED,
                  color: "#fff",
                  border: "none",
                  fontFamily: "monospace",
                  fontWeight: 700,
                }}
              >
                {historyGtd.gtd_number}
              </Tag>
            )}
          </Space>
        }
        open={isHistoryOpen}
        onCancel={closeHistoryModal}
        footer={[
          <Button
            key="close"
            danger
            icon={<CloseOutlined />}
            onClick={closeHistoryModal}
            style={{ borderRadius: 10 }}
          >
            Закрыть
          </Button>,
        ]}
        width={1200}
        style={{ top: 40 }}
        styles={{ body: { maxHeight: "72vh", overflowY: "auto" } }}
        destroyOnClose
        maskClosable
        keyboard
      >
        {extensionHistoryLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin size="middle" />
          </div>
        ) : safeHistory.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: "#999" }}>
                Заявок на продление пока нет
              </span>
            }
            style={{ padding: "40px 0" }}
          />
        ) : (
          <Table
            rowKey={(r) => String(r.id ?? Math.random())}
            columns={historyColumns}
            dataSource={safeHistory}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            tableLayout="fixed"
            size="middle"
          />
        )}
      </Modal>
    </div>
  );
};

export default GtdUpdate;
