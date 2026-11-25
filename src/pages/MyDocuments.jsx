import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Row,
  Col,
  Tooltip,
  Modal,
  Select,
  Descriptions,
  Divider,
  Avatar,
  Alert,
  Form,
  Input,
  InputNumber,
  DatePicker,
} from "antd";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  SendOutlined,
  FileTextOutlined,
  CloseOutlined,
  CalendarOutlined,
  DollarOutlined,
  ArrowLeftOutlined,
  FileDoneOutlined,
  BankOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

import { useMyDocumentsStore } from "../store/useMyDocuments";
import { useAuthStore } from "../store/useAuth";
import { useBranchDashboardStore } from "../store/useBranchDashboard";
import { useContractStore } from "../store/useContractStore";
import { searchCurrencies, searchCountries } from "../api/dictionary.service";
import { updateGtd } from "../api/gtd.service";
import { updatePaymentOrder } from "../api/paymentOrder.service";

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { TextArea } = Input;

const RED = "#8b0000";

const ENTITY_TYPES = [
  { value: "all", label: "Все типы" },
  { value: "gtd", label: "ГТД" },
  { value: "payment_order", label: "Платежные поручения" },
];

const ENTITY_TYPE_LABELS = {
  contract: "Контракт",
  additional_agreement: "Доп. соглашение",
  invoice: "Инвойс",
  gtd: "ГТД",
  payment_order: "Платежное поручение",
};

const ENTITY_TYPE_COLORS = {
  contract: "red",
  additional_agreement: "purple",
  invoice: "blue",
  gtd: "green",
};

const STATUS_OPTIONS = [
  { value: "all", label: "Все статусы" },
  { value: "pending_currency_control", label: "На валютном контроле" },
  { value: "pending_compliance", label: "На комплаенсе" },
  { value: "revision_required", label: "На доработке" },
  { value: "approved", label: "Одобрено" },
  { value: "rejected", label: "Отклонено" },
  { value: "rejected_currency_control", label: "Отклонено валютным контролем" },
  { value: "rejected_compliance", label: "Отклонено комплаенсом" },
];

const STATUS_MAP = {
  pending_currency_control: {
    label: "На валютном контроле",
    color: "orange",
    icon: <SyncOutlined spin  />,
  },
  pending_compliance: {
    label: "На комплаенсе",
    color: "gold",
    icon: <ClockCircleOutlined />,
  },
  revision_required: {
    label: "На доработке",
    color: "volcano",
    icon: <ExclamationCircleOutlined />,
  },
  revision: {
    label: "На доработке",
    color: "volcano",
    icon: <ExclamationCircleOutlined />,
  },
  approved: { label: "Одобрено", color: "green", icon: <CheckOutlined /> },
  rejected: { label: "Отклонено", color: "red", icon: <CloseCircleOutlined /> },
  rejected_currency_control: {
    label: "Отклонено валютным контролем",
    color: "red",
    icon: <CloseCircleOutlined />,
  },
  rejected_compliance: {
    label: "Отклонено комплаенсом",
    color: "red",
    icon: <CloseCircleOutlined />,
  },
};

const DECISION_MAP = {
  approve: { label: "Одобрено", color: "green" },
  approved: { label: "Одобрено", color: "green" },
  accepted: { label: "Принято", color: "green" },
  reject: { label: "Отклонено", color: "red" },
  rejected: { label: "Отклонено", color: "red" },
  revision: { label: "На доработке", color: "volcano" },
  revision_required: { label: "На доработке", color: "volcano" },
};

const SCOPE_OPTIONS = [
  { value: "all", label: "Все документы" },
  { value: "mine", label: "Только мои" },
];

const REVISION_STATUSES = ["revision_required", "revision"];
const isRevision = (record) =>
  !!record && REVISION_STATUSES.includes(record.approval_status);

const isRevisionDecision = (d) => REVISION_STATUSES.includes(d);

const getRevisionInfo = (record) => {
  if (!record) return { stage: "", reason: "" };

  const cc = record.currency_control_decision;
  const cp = record.compliance_decision;

  if (isRevisionDecision(cc) && record.currency_control_comment) {
    return { stage: "Валютный контроль", reason: record.currency_control_comment };
  }
  if (isRevisionDecision(cp) && record.compliance_comment) {
    return { stage: "Комплаенс", reason: record.compliance_comment };
  }
  if (record.currency_control_comment) {
    return { stage: "Валютный контроль", reason: record.currency_control_comment };
  }
  if (record.compliance_comment) {
    return { stage: "Комплаенс", reason: record.compliance_comment };
  }
  return { stage: "", reason: record.rejection_reason || "" };
};

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

const formatDate = (value) => {
  if (!value) return "—";
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(value))) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value, currency) => {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `${num.toLocaleString("ru-RU")} ${currency || ""}`.trim();
};

const getPersonName = (person) => {
  if (!person) return "";
  return [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
};

const toDayjs = (v) => {
  if (!v) return null;
  const d = dayjs(v, ["DD.MM.YYYY", "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss"], true);
  if (d.isValid()) return d;
  const loose = dayjs(v);
  return loose.isValid() ? loose : null;
};

const fmtApi = (d) => (d ? d.format("YYYY-MM-DD") : null);

const cleanErrorText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(cleanErrorText).filter(Boolean).join("; ");
  }
  if (typeof value === "object") {
    const direct = value.error ?? value.detail ?? value.message;
    if (direct !== undefined && direct !== null) return cleanErrorText(direct);
    return Object.values(value).map(cleanErrorText).filter(Boolean).join("; ");
  }
  return String(value);
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
};

const pick = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && v !== "");

const normName = (v) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const resolveCompanyId = async (record, branchId, contractId) => {
  const direct = pick(
    record.company_id,
    record.company?.id,
    record.counterparty_id,
  );
  if (direct) return direct;

  const name = normName(record.counterparty_name);
  if (!branchId || !name) return null;

  try {
    await useBranchDashboardStore
      .getState()
      .fetchDashboard(branchId, { query: "", search_type: "name" });
  } catch (e) {
    console.warn("Не удалось загрузить компании филиала:", e);
  }

  const list = toArray(useBranchDashboardStore.getState().companies);
  const candidates = list.filter((c) =>
    [c.llc, c.name, c.company_name].some((v) => normName(v) === name),
  );

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].id ?? candidates[0].company_id;

  for (const c of candidates) {
    const cid = c.id ?? c.company_id;
    if (!cid) continue;
    try {
      await useContractStore.getState().fetchContracts(branchId, cid);
      const contracts = toArray(useContractStore.getState().contracts);
      if (contracts.some((k) => String(k.id) === String(contractId))) {
        return cid;
      }
    } catch (e) {
      console.warn("Не удалось проверить контракты компании:", e);
    }
  }
  return null;
};

const buildEditValues = (record) => {
  if (!record) return {};

  if (record.entity_type === "payment_order") {
    return {
      value_date: toDayjs(record.value_date || record.document_date),
      amount:
        record.amount !== null && record.amount !== undefined
          ? Number(record.amount)
          : undefined,
      currency: record.currency || undefined,
      sender_name: record.sender_name || "",
      receiver_name: record.receiver_name || "",
      receiver_bank: record.receiver_bank || "",
      receiver_country: record.receiver_country || undefined,
      payment_purpose: record.payment_purpose || "",
      resubmit_comment: "",
    };
  }

  return {
    gtd_number: record.document_number || "",
    gtd_date: toDayjs(record.document_date),
    gtd_amount:
      record.amount !== null && record.amount !== undefined
        ? Number(record.amount)
        : undefined,
    resubmit_comment: "",
  };
};

const MyDocuments = () => {
  const navigate = useNavigate();
  const { branchId: userBranchId } = useAuthStore();

  const {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    filters,
    setFilter,
    resetFilters,
    fetchMyDocuments,
    clearError,
  } = useMyDocumentsStore();

  const [searchValue, setSearchValue] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFileList, setEditFileList] = useState([]);
  const [editForm] = Form.useForm();

  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const safeItems = Array.isArray(items) ? items : [];

  useEffect(() => {
    fetchMyDocuments();
  }, []);

  useEffect(() => {
    const loadDictionaries = async () => {
      setLoadingCurrencies(true);
      try {
        const data = await searchCurrencies("");
        const fallbackNames = {
          CNY: "Китайский юань", EUR: "Евро", GBP: "Английский фунт стерлингов",
          GEL: "Грузинский лари", JPY: "Японская иена", KGS: "Кыргызский сом",
          KZT: "Казахский тенге", RUB: "Российский рубль", USD: "Доллар США",
          TJS: "Таджикский сомони",
        };

        const formattedCurrencies = (data || []).map((item) => {
          if (typeof item === "string") {
            return {
              value: item,
              label: fallbackNames[item] ? `${item} - ${fallbackNames[item]}` : item,
            };
          }
          const code = String(item.code || item.iso_code || item.currency_code || item.value || item.id || "").toUpperCase();
          let name = item.name_ru || item.name || item.title || item.label || item.description || "";
          if (!name && fallbackNames[code]) name = fallbackNames[code];
          return { value: code, label: name ? `${code} - ${name}` : code };
        });
        setCurrencies(formattedCurrencies);
      } catch (err) {
        message.error("Не удалось загрузить список валют");
      } finally {
        setLoadingCurrencies(false);
      }

      setLoadingCountries(true);
      try {
        const data = await searchCountries("");
        const formattedCountries = (data || []).map((item) => {
          if (typeof item === "string") {
            return { value: item, label: item };
          }
          const val = String(item.name_ru || item.name || item.title || item.id || "");
          return { value: val, label: val };
        });
        setCountries(formattedCountries);
      } catch (err) {
        message.error("Не удалось загрузить список стран");
      } finally {
        setLoadingCountries(false);
      }
    };

    loadDictionaries();
  }, []);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSearch = () => {
    setFilter("search", searchValue);
    setFilter("page", 1);
    fetchMyDocuments({ ...filters, search: searchValue, page: 1 });
  };

  const handleReset = () => {
    setSearchValue("");
    resetFilters();
    fetchMyDocuments({
      scope: "mine",
      status: "all",
      entity_type: "all",
      page: 1,
      page_size: 20,
    });
  };

  const handleOpenDetail = (record) => {
    setDetailDoc(record);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setDetailDoc(null);
  };

  const handleOpenEdit = (record) => {
    setEditDoc(record);
    setEditFileList([]);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (editSubmitting) return;
    setIsEditOpen(false);
    setEditDoc(null);
    setEditFileList([]);
    editForm.resetFields();
  };

  const handleEditSubmit = async () => {
    if (!editDoc || editSubmitting) return;

    let values;
    try {
      values = await editForm.validateFields();
    } catch {
      return;
    }

    const isPO = editDoc.entity_type === "payment_order";
    const comment = values.resubmit_comment?.trim() || "";
    const file = editFileList[0]?.originFileObj || editFileList[0] || null;

    const branchId = pick(editDoc.branch_id, editDoc.branch?.id, userBranchId);
    const contractId = pick(editDoc.contract_id, editDoc.contract?.id);
    const invoiceId = pick(editDoc.invoice_id, editDoc.invoice?.id);
    const agreementId = pick(editDoc.additional_agreement_id, editDoc.agreement_id) ?? null;
    const entityId = editDoc.entity_id;

    const missingBase = [
      !branchId && "branch_id",
      !contractId && "contract_id",
      isPO && !invoiceId && "invoice_id",
    ].filter(Boolean);

    if (missingBase.length) {
      message.error(`Бэкенд не вернул: ${missingBase.join(", ")}`);
      return;
    }

    setEditSubmitting(true);
    try {
      const companyId = await resolveCompanyId(editDoc, branchId, contractId);

      if (!companyId) {
        message.error("Не удалось определить компанию документа.");
        return;
      }

      // 1) PUT — сохраняем исправленные данные И ОТПРАВЛЯЕМ В ВАЛЮТНЫЙ КОНТРОЛЬ
      if (isPO) {
        await updatePaymentOrder(
          branchId,
          companyId,
          contractId,
          invoiceId,
          entityId,
          {
            operation_date:
              fmtApi(toDayjs(editDoc.operation_date)) ||
              fmtApi(values.value_date),
            payment_order_number:
              editDoc.payment_order_number || editDoc.document_number || "",
            value_date: fmtApi(values.value_date),
            amount: values.amount,
            currency: values.currency,
            payer: values.sender_name,
            sender_name: values.sender_name,
            sender_bank: editDoc.sender_bank || "Актив Банк",
            sender_country: editDoc.sender_country || "Таджикистан",
            receiver_name: values.receiver_name,
            receiver_bank: values.receiver_bank,
            receiver_country: values.receiver_country,
            payment_purpose: values.payment_purpose,
            document: file,
            // 👇 Отправляем статус для валютного контроля
            approval_status: "pending_currency_control",
            comment: comment,
          },
          agreementId,
        );
      } else {
        await updateGtd(branchId, companyId, contractId, entityId, {
          gtd_number: values.gtd_number,
          gtd_date: fmtApi(values.gtd_date),
          gtd_amount: values.gtd_amount,
          gtd_currency: editDoc.currency || "USD",
          document_type: "gtd",
          invoice_id: invoiceId || null,
          document: file,
          // 👇 Отправляем статус для валютного контроля
          approval_status: "pending_currency_control",
          comment: comment,
        });
      }

      message.success("Документ исправлен и отправлен в валютный контроль");
      setIsEditOpen(false);
      setEditDoc(null);
      setEditFileList([]);
      editForm.resetFields();
      await fetchMyDocuments();
    } catch (e) {
      message.error(
        cleanErrorText(e?.response?.data) ||
          e?.message ||
          "Не удалось сохранить документ",
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const renderRevisionAlert = (record, { compact = false } = {}) => {
    const { stage, reason } = getRevisionInfo(record);
    return (
      <Alert
        type="warning"
        showIcon
        style={{
          borderRadius: 10,
          border: "1px solid #ffbb96",
          background: "#fff2e8",
          padding: compact ? "4px 10px" : undefined,
          marginBottom: compact ? 0 : 16,
        }}
        message={
          <Text strong style={{ fontSize: compact ? 12 : 14, color: "#d4380d" }}>
            {stage ? `${stage}: посмотрите причину` : "Посмотрите причину"}
          </Text>
        }
        description={
          <Text style={{ fontSize: compact ? 12 : 13 }}>
            {reason || "Причина не указана"}
          </Text>
        }
      />
    );
  };

  const columns = [
    {
      title: "Документ",
      dataIndex: "document_number",
      key: "document_number",
      width: 230,
      render: (v, record) => (
        <Space size={10} align="center">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "#f9f0ff",
              border: "1px solid #d3adf7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#722ed1",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            <FileTextOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <Text
              strong
              style={{
                display: "block",
                fontSize: 13,
                fontFamily: "monospace",
                whiteSpace: "nowrap",
              }}
            >
              {v || "—"}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              ID: {record.entity_id}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Тип",
      dataIndex: "entity_type",
      key: "entity_type",
      width: 150,
      render: (v) => (
        <Tag
          color={ENTITY_TYPE_COLORS[v] || "default"}
          style={{ borderRadius: 8, fontWeight: 600, fontSize: 12 }}
        >
          {ENTITY_TYPE_LABELS[v] || v || "—"}
        </Tag>
      ),
    },
    {
      title: "Название компании",
      dataIndex: "counterparty_name",
      key: "counterparty_name",
      width: 200,
      render: (v) => (
        <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      width: 160,
      render: (v, record) => (
        <Text strong style={{ fontSize: 13, color: "#d946ef" }}>
          {formatMoney(v, record.currency)}
        </Text>
      ),
    },
    {
      title: "Филиал",
      dataIndex: "branch_name",
      key: "branch_name",
      width: 180,
      render: (v) => (
        <Space size={6}>
          <BankOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: v }}>
            {v || "—"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "approval_status",
      key: "approval_status",
      width: 300,
      render: (v) => {
        const info = STATUS_MAP[v] || {
          label: v || "—",
          color: "default",
          icon: null,
        };
        return (
          <Tag
            color={info.color}
            icon={info.icon}
            style={{
              borderRadius: 999,
              fontWeight: 600,
              padding: "2px 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              margin: 0,
            }}
          >
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: "Дата",
      dataIndex: "document_date",
      key: "document_date",
      width: 260,
      align: "center",
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDate(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Создан",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      align: "center",
      render: (v) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(v)}
        </Text>
      ),
    },
    {
      title: "Действие",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title="Подробнее">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: RED }} />}
              onClick={() => handleOpenDetail(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const requiredRule = (text) => [{ required: true, message: text }];

  const moneyInputProps = {
    min: 0,
    style: { width: "100%", borderRadius: 10 },
    formatter: (v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " "),
    parser: (v) => (v ? v.replace(/\s/g, "") : ""),
    placeholder: "Введите сумму",
  };

  const renderEditFields = () => {
    const isPO = editDoc?.entity_type === "payment_order";

    return (
      <>
        {isPO ? (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Дата валютирования"
                  name="value_date"
                  rules={requiredRule("Пожалуйста, укажите дату валютирования")}
                >
                  <DatePicker
                    style={{ width: "100%", borderRadius: 10 }}
                    format="DD.MM.YYYY"
                    placeholder="Выберите дату"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Сумма платежа"
                  name="amount"
                  rules={requiredRule("Пожалуйста, укажите сумму")}
                >
                  <InputNumber {...moneyInputProps} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Валюта платежа"
                  name="currency"
                  rules={requiredRule("Пожалуйста, выберите валюту")}
                >
                  <Select
                    style={{ border: "1px solid #8b0000" }}
                    showSearch
                    placeholder="Выберите валюту"
                    options={currencies}
                    optionFilterProp="label"
                    loading={loadingCurrencies}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Отправитель"
                  name="sender_name"
                  rules={requiredRule("Укажите отправителя")}
                >
                  <Input
                    style={{ borderRadius: 10 }}
                    placeholder="Введите отправителя"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Получатель"
                  name="receiver_name"
                  rules={requiredRule("Укажите получателя")}
                >
                  <Input
                    style={{ borderRadius: 10 }}
                    placeholder="Введите получателя"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Банк получателя"
                  name="receiver_bank"
                  rules={requiredRule("Укажите банк получателя")}
                >
                  <Input
                    style={{ borderRadius: 10 }}
                    placeholder="Введите название банка"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Страна получателя"
                  name="receiver_country"
                  rules={requiredRule("Укажите страну получателя")}
                >
                  <Select
                    showSearch
                    placeholder="Выберите или введите страну"
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      border: "1px solid #8b0000",
                    }}
                    loading={loadingCountries}
                    optionFilterProp="label"
                    options={countries}
                    allowClear
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Назначение платежа"
              name="payment_purpose"
              rules={requiredRule("Укажите назначение платежа")}
            >
              <TextArea
                rows={2}
                style={{ borderRadius: 10 }}
                placeholder="Введите назначение платежа"
              />
            </Form.Item>
          </>
        ) : (
          <>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="Номер ГТД"
                  name="gtd_number"
                  rules={requiredRule("Укажите номер ГТД")}
                >
                  <Input
                    style={{ borderRadius: 10 }}
                    placeholder="Введите номер ГТД"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Дата ГТД"
                  name="gtd_date"
                  rules={requiredRule("Пожалуйста, укажите дату ГТД")}
                >
                  <DatePicker
                    style={{ width: "100%", borderRadius: 10 }}
                    format="DD.MM.YYYY"
                    placeholder="Выберите дату"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Сумма ГТД"
                  name="gtd_amount"
                  rules={requiredRule("Пожалуйста, укажите сумму")}
                >
                  <InputNumber {...moneyInputProps} />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
      </>
    );
  };

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
              background: RED,
              boxShadow: "0 10px 24px rgba(217,70,239,0.28)",
              flexShrink: 0,
            }}
          >
            <FileDoneOutlined style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: RED }}>
              Мои документы
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Контракты, инвойсы, ГТД, доп. соглашения — все статусы
            </Text>
          </div>
        </Space>

        <Space>
          <Button
            danger
            icon={<ReloadOutlined />}
            onClick={() => fetchMyDocuments()}
            style={{
              borderRadius: 12,
              background: RED,
              border: `1px solid ${RED}`,
              height: 35,
              color: "#fff",
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
          marginBottom: 20,
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        }}
        bodyStyle={{ padding: 20 }}
      >
        <Space align="center" size={10} style={{ marginBottom: 16 }}>
          <FilterOutlined style={{ color: RED, fontSize: 16 }} />
          <Text strong style={{ fontSize: 15, color: RED }}>
            Фильтры
          </Text>
        </Space>

        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={6} lg={5}>
            <Text
              style={{ display: "block", marginBottom: 8, fontSize: 14, color: RED }}
            >
              Область
            </Text>
            <Select
              value={filters.scope}
              onChange={(v) => {
                setFilter("scope", v);
                setFilter("page", 1);
                fetchMyDocuments({ ...filters, scope: v, page: 1 });
              }}
              options={SCOPE_OPTIONS}
              style={{ width: "100%", height: 35, border: `1px solid ${RED}` }}
            />
          </Col>

          <Col xs={24} md={6} lg={5}>
            <Text
              style={{ display: "block", marginBottom: 8, fontSize: 14, color: RED }}
            >
              Статус
            </Text>
            <Select
              value={filters.status}
              onChange={(v) => {
                setFilter("status", v);
                setFilter("page", 1);
                fetchMyDocuments({ ...filters, status: v, page: 1 });
              }}
              options={STATUS_OPTIONS}
              style={{ width: "100%", height: 35, border: `1px solid ${RED}` }}
            />
          </Col>

          <Col xs={24} md={6} lg={5}>
            <Text
              style={{ display: "block", marginBottom: 8, fontSize: 14, color: RED }}
            >
              Тип документа
            </Text>
            <Select
              value={filters.entity_type}
              onChange={(v) => {
                setFilter("entity_type", v);
                setFilter("page", 1);
                fetchMyDocuments({ ...filters, entity_type: v, page: 1 });
              }}
              options={ENTITY_TYPES}
              style={{ width: "100%", height: 35, border: `1px solid ${RED}` }}
            />
          </Col>

          <Col xs={24} md={6} lg={4}>
            <Space size={8} style={{ width: "100%", display: "flex" }}>
              <Button
                type="primary"
                danger
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 10,
                  height: 35,
                  background: RED,
                  border: "none",
                  boxShadow: "0 6px 16px rgba(217,70,239,0.28)",
                  fontWeight: 600,
                }}
              >
                Поиск
              </Button>
              <Button
                danger
                onClick={handleReset}
                style={{ flex: 1, minWidth: 0, borderRadius: 10, height: 35 }}
              >
                Сбросить
              </Button>
            </Space>
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
            <FileTextOutlined style={{ color: RED, fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: RED }}>
              Мои документы
            </Text>
          </Space>
          <Tag
            color="red"
            style={{
              color: RED,
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
          {loading && safeItems.length === 0 ? (
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
              rowKey={(r) =>
                `${r.entity_type}-${r.entity_id}-${r.document_number}`
              }
              loading={loading}
              columns={columns}
              dataSource={safeItems}
              scroll={{ x: 1400 }}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                showSizeChanger: false,
                onChange: (p) => {
                  setFilter("page", p);
                  fetchMyDocuments({ ...filters, page: p });
                },
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: "#999" }}>Документов нет</span>
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
          <Space size={10}>
            <FileTextOutlined style={{ color: RED, fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: RED }}>Детали документа</span>
            {detailDoc?.approval_status && (
              <Tag
                color={STATUS_MAP[detailDoc.approval_status]?.color || "default"}
                style={{ borderRadius: 999, fontWeight: 600, margin: 0 }}
              >
                {STATUS_MAP[detailDoc.approval_status]?.label ||
                  detailDoc.approval_status}
              </Tag>
            )}
          </Space>
        }
        open={isDetailOpen}
        onCancel={handleCloseDetail}
        footer={[
          isRevision(detailDoc) &&
            ["gtd", "payment_order"].includes(detailDoc?.entity_type) && (
              <Button
                key="edit"
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  const doc = detailDoc;
                  handleCloseDetail();
                  handleOpenEdit(doc);
                }}
                style={{
                  borderRadius: 10,
                  background: "#d4380d",
                  borderColor: "#d4380d",
                }}
              >
                Исправить и отправить
              </Button>
            ),
          <Button
            key="close"
            danger
            icon={<CloseOutlined />}
            onClick={handleCloseDetail}
            style={{ borderRadius: 10 }}
          >
            Закрыть
          </Button>,
        ]}
        width={900}
        style={{ top: 60 }}
        destroyOnHidden
        maskClosable
      >
        {!detailDoc ? (
          <Empty description="Нет данных" />
        ) : (
          <>
            {isRevision(detailDoc) && renderRevisionAlert(detailDoc)}

            <Descriptions
              title={
                <Space size={8}>
                  <Tag
                    color={ENTITY_TYPE_COLORS[detailDoc.entity_type] || "default"}
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    {ENTITY_TYPE_LABELS[detailDoc.entity_type] ||
                      detailDoc.entity_type}
                  </Tag>
                  <Text strong style={{ fontFamily: "monospace" }}>
                    {detailDoc.document_number || `ID ${detailDoc.entity_id}`}
                  </Text>
                </Space>
              }
              bordered
              column={2}
              size="small"
              labelStyle={{
                background: "#fafafa",
                fontWeight: 600,
                fontSize: 12,
                width: 170,
              }}
              contentStyle={{ fontSize: 13 }}
            >
              <Descriptions.Item label="ID записи">
                {detailDoc.entity_id ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Филиал">
                {detailDoc.branch_name || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Номер документа">
                {detailDoc.document_number || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Предмет">
                {detailDoc.subject || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Название компании">
                {detailDoc.counterparty_name || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Сумма">
                <Space size={4}>
                  <DollarOutlined style={{ color: "#8b5cf6" }} />
                  {formatMoney(detailDoc.amount, detailDoc.currency)}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Дата документа">
                <Space size={4}>
                  <CalendarOutlined style={{ color: "#8b5cf6" }} />
                  {formatDate(detailDoc.document_date)}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Создан">
                {formatDateTime(detailDoc.created_at)}
              </Descriptions.Item>

              <Descriptions.Item label="Путь к файлу" span={2}>
                {detailDoc.document_path ? (
                  <Text
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#8b5cf6",
                    }}
                  >
                    {detailDoc.document_path}
                  </Text>
                ) : (
                  "—"
                )}
              </Descriptions.Item>

              {detailDoc.rejection_reason && (
                <Descriptions.Item label="Причина отклонения" span={2}>
                  <Text style={{ color: "#cf1322" }}>
                    {detailDoc.rejection_reason}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider style={{ margin: "16px 0" }}>Создатель</Divider>

            <Card size="small" style={{ borderRadius: 12 }}>
              <Space size={10} align="center">
                <Avatar
                  size={36}
                  style={{ background: "linear-gradient(135deg, #ff4b4b, #d946ef)" }}
                >
                  {String(
                    detailDoc.creator?.login ||
                      detailDoc.creator?.first_name ||
                      "?",
                  )
                    .charAt(0)
                    .toUpperCase()}
                </Avatar>
                <Space direction="vertical" size={0}>
                  <Text strong style={{ fontSize: 13 }}>
                    {getPersonName(detailDoc.creator) || "—"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#d9363e" }}>
                    {detailDoc.creator?.login || "—"}
                  </Text>
                  {detailDoc.creator?.email && (
                    <Text style={{ fontSize: 12, color: "#ff4b4b" }}>
                      {detailDoc.creator.email}
                    </Text>
                  )}
                </Space>
              </Space>
            </Card>

            {(detailDoc.compliance_decision ||
              detailDoc.compliance_comment ||
              detailDoc.compliance_reviewer) && (
              <>
                <Divider style={{ margin: "16px 0" }}>Комплаенс</Divider>
                <Card
                  size="small"
                  style={{
                    borderRadius: 12,
                    background:
                      detailDoc.compliance_decision === "approved"
                        ? "#f6ffed"
                        : detailDoc.compliance_decision === "rejected"
                          ? "#fff1f0"
                          : "#fafafa",
                  }}
                >
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Space size={6}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Решение:
                      </Text>
                      <Tag
                        color={
                          detailDoc.compliance_decision === "approved" ||
                          detailDoc.compliance_decision === "accepted"
                            ? "green"
                            : detailDoc.compliance_decision === "rejected" ||
                                detailDoc.compliance_decision === "reject"
                              ? "red"
                              : "gold"
                        }
                        style={{ borderRadius: 6, margin: 0 }}
                      >
                        {DECISION_MAP[detailDoc.compliance_decision]?.label ||
                          detailDoc.compliance_decision ||
                          "—"}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDateTime(detailDoc.compliance_reviewed_at)}
                      </Text>
                    </Space>
                    {detailDoc.compliance_comment && (
                      <Text style={{ fontSize: 12 }}>
                        «{detailDoc.compliance_comment}»
                      </Text>
                    )}
                    {detailDoc.compliance_reviewer && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Рассмотрел:{" "}
                        <Text style={{ color: "#8b5cf6" }}>
                          {getPersonName(detailDoc.compliance_reviewer) ||
                            detailDoc.compliance_reviewer.login}
                        </Text>
                      </Text>
                    )}
                  </Space>
                </Card>
              </>
            )}

            {(detailDoc.currency_control_decision ||
              detailDoc.currency_control_comment ||
              detailDoc.currency_control_reviewer) && (
              <>
                <Divider style={{ margin: "16px 0" }}>Валютный контроль</Divider>
                <Card
                  size="small"
                  style={{
                    borderRadius: 12,
                    background:
                      detailDoc.currency_control_decision === "approved"
                        ? "#f6ffed"
                        : detailDoc.currency_control_decision === "rejected"
                          ? "#fff1f0"
                          : "#fafafa",
                  }}
                >
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Space size={6}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Решение:
                      </Text>
                      <Tag
                        color={
                          detailDoc.currency_control_decision === "approved" ||
                          detailDoc.currency_control_decision === "accepted"
                            ? "green"
                            : detailDoc.currency_control_decision === "rejected" ||
                                detailDoc.currency_control_decision === "reject"
                              ? "red"
                              : "gold"
                        }
                        style={{ borderRadius: 6, margin: 0 }}
                      >
                        {DECISION_MAP[detailDoc.currency_control_decision]
                          ?.label ||
                          detailDoc.currency_control_decision ||
                          "—"}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDateTime(detailDoc.currency_control_reviewed_at)}
                      </Text>
                    </Space>
                    {detailDoc.currency_control_comment && (
                      <Text style={{ fontSize: 12 }}>
                        «{detailDoc.currency_control_comment}»
                      </Text>
                    )}
                    {detailDoc.currency_control_reviewer && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Рассмотрел:{" "}
                        <Text style={{ color: "#8b5cf6" }}>
                          {getPersonName(detailDoc.currency_control_reviewer) ||
                            detailDoc.currency_control_reviewer.login}
                        </Text>
                      </Text>
                    )}
                  </Space>
                </Card>
              </>
            )}
          </>
        )}
      </Modal>

      <Modal
        title={
          <Space size={10}>
            <EditOutlined style={{ color: "#d4380d", fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: RED }}>
              {editDoc?.entity_type === "payment_order"
                ? "Исправить платёжное поручение"
                : "Исправить ГТД"}
            </span>
            {editDoc?.document_number && (
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
                {editDoc.document_number}
              </Tag>
            )}
          </Space>
        }
        open={isEditOpen}
        onCancel={closeEditModal}
        mask={{ closable: false }}
        footer={[
          <Button
            key="send"
            type="primary"
            icon={<SendOutlined />}
            loading={editSubmitting}
            onClick={handleEditSubmit}
            style={{ borderRadius: 10, background: RED, borderColor: RED }}
          >
            Отправить в валютный контроль
          </Button>,
          <Button
            key="cancel"
            danger
            disabled={editSubmitting}
            onClick={closeEditModal}
            style={{ borderRadius: 10 }}
          >
            Отмена
          </Button>,
        ]}
        width={760}
        style={{ top: 40 }}
        destroyOnHidden
      >
        {editDoc && (
          <div style={{ maxHeight: "70vh", paddingRight: 4 }}>
            {isRevision(editDoc) && renderRevisionAlert(editDoc)}

            <Form
              key={`${editDoc.entity_type}-${editDoc.entity_id}`}
              form={editForm}
              layout="vertical"
              autoComplete="off"
              preserve={false}
              initialValues={buildEditValues(editDoc)}
            >
              {renderEditFields()}
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyDocuments;