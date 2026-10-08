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
  UserOutlined,
  DollarOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  GlobalOutlined,
  HistoryOutlined,
  InboxOutlined,
  MinusOutlined,
  SendOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import { useAdditionalAgreementsStore } from "../store/useAdditionalAgreementsStore";
import { useInvoiceStore } from "../store/useInvoiceStore";
import { useGtdStore } from "../store/useGtdStore";
import { usePaymentOrderStore } from "../store/usePaymentOrderStore";
import { useAuthStore } from "../store/useAuth";
import { searchCountries, searchCurrencies } from "../api/dictionary.service";
import { getAgreementInvoices } from "../api/invoice.service";
import { fetchGtdByInvoice } from "../api/gtd.service";
import { fetchPaymentOrders } from "../api/paymentOrder.service";
import DocumentLink from "./DocumentLink";

const { Title, Text } = Typography;

const RED = "#8b0000";

const CAN_CREATE_EDIT = ["admin", "compliance", "operator"];
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

const INITIAL_AGREEMENT_VALUES = {
  currency: undefined,
  return_days: "",
};

const INITIAL_INVOICE_VALUES = {
  currency: undefined,
  document: [],
};

const INITIAL_GTD_VALUES = {
  gtd_currency: "USD",
  document_type: "gtd",
  document: [],
};

const INITIAL_PO_VALUES = {
  currency: "USD",
  document: [],
};

// ==================== ХЕЛПЕРЫ ДЛЯ SELECT ====================
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

export const AdditionalAgreements = () => {
  const { id: branchId, companyId, contractId } = useParams();
  const navigate = useNavigate();

  // ===== STORE: AGREEMENTS =====
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

  // ===== STORE: INVOICES =====
  const {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    error: invoicesError,
    clearError: clearInvoiceError,
  } = useInvoiceStore();

  // ===== STORE: GTD =====
  const {
    createGtd,
    updateGtd,
    deleteGtd,
    error: gtdError,
    clearError: clearGtdError,
  } = useGtdStore();

  // ===== STORE: PAYMENT ORDERS =====
  const {
    createPaymentOrder,
    updatePaymentOrder,
    deletePaymentOrder,
    error: poError,
    clearError: clearPoError,
  } = usePaymentOrderStore();

  const { role, user } = useAuthStore();

  const [activeBranchId, setActiveBranchId] = useState(branchId);

  // ===== AGREEMENTS state =====
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [editingAgreement, setEditingAgreement] = useState(null);

  // ===== INVOICES state =====
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceForm] = Form.useForm();
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedAgreementId, setSelectedAgreementId] = useState(null);

  // ===== GTD state =====
  const [isGtdModalOpen, setIsGtdModalOpen] = useState(false);
  const [gtdSubmitting, setGtdSubmitting] = useState(false);
  const [gtdForm] = Form.useForm();
  const [editingGtd, setEditingGtd] = useState(null);
  const [gtdContext, setGtdContext] = useState({
    invoiceId: null,
    agreementId: null,
  });

  // ===== PO state =====
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poSubmitting, setPoSubmitting] = useState(false);
  const [poForm] = Form.useForm();
  const [editingPo, setEditingPo] = useState(null);
  const [poContext, setPoContext] = useState({
    invoiceId: null,
    agreementId: null,
  });

  // ===== КЭШ: инвойсы по agreementId =====
  const [invoicesByAgreement, setInvoicesByAgreement] = useState({});
  const [loadingInvoicesMap, setLoadingInvoicesMap] = useState({});

  // ===== КЭШ: ГТД и ПП по invoiceId =====
  const [gtdByInvoice, setGtdByInvoice] = useState({});
  const [loadingGtdMap, setLoadingGtdMap] = useState({});
  const [poByInvoice, setPoByInvoice] = useState({});
  const [loadingPoMap, setLoadingPoMap] = useState({});

  // ===== СПРАВОЧНИКИ =====
  const [currencies, setCurrencies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const normalizedRole = String(role || "").toLowerCase();
  const canCreateEdit = CAN_CREATE_EDIT.includes(normalizedRole);
  const canDelete = CAN_DELETE.includes(normalizedRole);
  const safeAgreements = Array.isArray(agreements) ? agreements : [];

  const currencyOptions = buildCurrencyOptions(currencies);
  const countryOptions = buildCountryOptions(countries);

  // ===== ЭФФЕКТЫ =====
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
    if (invoicesError) {
      message.error(invoicesError);
      clearInvoiceError?.();
    }
    if (gtdError) {
      message.error(gtdError);
      clearGtdError?.();
    }
    if (poError) {
      message.error(poError);
      clearPoError?.();
    }
  }, [
    error,
    invoicesError,
    gtdError,
    poError,
    clearError,
    clearInvoiceError,
    clearGtdError,
    clearPoError,
  ]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingCurrencies(true);
      try {
        const currenciesData = await searchCurrencies("");
        setCurrencies(toArray(currenciesData));
      } catch (err) {
        console.error("Ошибка загрузки валют:", err);
      } finally {
        setLoadingCurrencies(false);
      }

      setLoadingCountries(true);
      try {
        const countriesData = await searchCountries("");
        setCountries(toArray(countriesData));
      } catch (err) {
        console.error("Ошибка загрузки стран:", err);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchInitialData();
  }, []);

  // ===== ЗАГРУЗКА ИНВОЙСОВ =====
  const loadInvoicesForAgreement = async (agreementId) => {
    if (!agreementId) return;
    setLoadingInvoicesMap((prev) => ({ ...prev, [agreementId]: true }));
    try {
      const data = await getAgreementInvoices(
        branchId,
        companyId,
        contractId,
        agreementId,
      );
      setInvoicesByAgreement((prev) => ({
        ...prev,
        [agreementId]: toArray(data),
      }));
    } catch (err) {
      console.error("Ошибка загрузки инвойсов:", err);
      setInvoicesByAgreement((prev) => ({ ...prev, [agreementId]: [] }));
    } finally {
      setLoadingInvoicesMap((prev) => ({ ...prev, [agreementId]: false }));
    }
  };

  // ===== ЗАГРУЗКА ГТД ПО ИНВОЙСУ =====
  const loadGtdForInvoice = async (invoiceId, agreementId) => {
    if (!invoiceId) return;
    setLoadingGtdMap((prev) => ({ ...prev, [invoiceId]: true }));
    try {
      const data = await fetchGtdByInvoice(
        branchId,
        companyId,
        contractId,
        invoiceId,
        agreementId,
      );
      setGtdByInvoice((prev) => ({
        ...prev,
        [invoiceId]: toArray(data),
      }));
    } catch (err) {
      console.error("Ошибка загрузки ГТД:", err);
      setGtdByInvoice((prev) => ({ ...prev, [invoiceId]: [] }));
    } finally {
      setLoadingGtdMap((prev) => ({ ...prev, [invoiceId]: false }));
    }
  };

  // ===== ЗАГРУЗКА ПП ПО ИНВОЙСУ =====
  const loadPoForInvoice = async (invoiceId, agreementId) => {
    if (!invoiceId) return;
    setLoadingPoMap((prev) => ({ ...prev, [invoiceId]: true }));
    try {
      const data = await fetchPaymentOrders(
        branchId,
        companyId,
        contractId,
        invoiceId,
        agreementId,
      );
      setPoByInvoice((prev) => ({
        ...prev,
        [invoiceId]: toArray(data),
      }));
    } catch (err) {
      console.error("Ошибка загрузки ПП:", err);
      setPoByInvoice((prev) => ({ ...prev, [invoiceId]: [] }));
    } finally {
      setLoadingPoMap((prev) => ({ ...prev, [invoiceId]: false }));
    }
  };

  // ===== АВТОР =====
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

  // ===== AGREEMENTS CRUD =====
  const openCreateModal = () => {
    setEditingAgreement(null);
    form.resetFields();
    form.setFieldsValue({
      ...INITIAL_AGREEMENT_VALUES,
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
        sender_name: values.sender_name?.trim() || "",
        sender_bank: values.sender_bank?.trim() || "",
        sender_country: values.sender_country || "",
        document: values.document?.[0]?.originFileObj || null,
      };

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
            : "Не удалось создать доп. соглашение"),
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

  // ===== INVOICES CRUD =====
  const openCreateInvoiceModal = (agreementId) => {
    setSelectedAgreementId(agreementId);
    setEditingInvoice(null);
    invoiceForm.resetFields();
    invoiceForm.setFieldsValue(INITIAL_INVOICE_VALUES);
    setIsInvoiceModalOpen(true);
  };

  const openEditInvoiceModal = (record, agreementId) => {
    setEditingInvoice(record);
    setSelectedAgreementId(agreementId || record.agreement_id);
    invoiceForm.setFieldsValue({
      invoice_number: record.invoice_number || "",
      invoice_date: record.invoice_date ? dayjs(record.invoice_date) : null,
      amount:
        record.amount !== undefined && record.amount !== null
          ? String(record.amount)
          : "",
      currency: record.currency || "USD",
      hs_code: record.hs_code || "",
      sender_name: record.sender_name || "",
      sender_bank: record.sender_bank || "",
      sender_country: record.sender_country || "",
      document: [],
    });
    setIsInvoiceModalOpen(true);
  };

  const handleInvoiceSubmit = async () => {
    if (invoiceSubmitting || !selectedAgreementId) return;

    let values;
    try {
      values = await invoiceForm.validateFields();
    } catch {
      return;
    }

    setInvoiceSubmitting(true);
    try {
      const formData = new FormData();
      formData.append(
        "invoice_number",
        String(values.invoice_number || "").trim(),
      );
      formData.append(
        "invoice_date",
        dayjs(values.invoice_date).format("YYYY-MM-DD"),
      );
      formData.append("amount", String(Number(values.amount)));
      formData.append("currency", String(values.currency || ""));
      formData.append("hs_code", String(values.hs_code || "").trim());
      formData.append("sender_name", String(values.sender_name || "").trim());
      formData.append("sender_bank", String(values.sender_bank || "").trim());
      formData.append(
        "sender_country",
        String(values.sender_country || "").trim(),
      );

      const fileObj = values?.document?.[0]?.originFileObj;
      if (fileObj) formData.append("document", fileObj);

      if (editingInvoice) {
        await updateInvoice(
          branchId,
          companyId,
          contractId,
          editingInvoice.id,
          formData,
          selectedAgreementId,
        );
        message.success("Инвойс обновлён");
      } else {
        await createInvoice(
          branchId,
          companyId,
          contractId,
          formData,
          selectedAgreementId,
        );
        message.success("Инвойс создан");
      }

      setIsInvoiceModalOpen(false);
      invoiceForm.resetFields();
      setEditingInvoice(null);

      await loadInvoicesForAgreement(selectedAgreementId);
    } catch (err) {
      console.error("Ошибка сохранения инвойса:", err);
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
            : "Не удалось создать инвойс"),
      );
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (e, invoiceId, agreementId) => {
    e?.stopPropagation?.();
    try {
      await deleteInvoice(
        branchId,
        companyId,
        contractId,
        invoiceId,
        agreementId,
      );
      message.success("Инвойс удалён в корзину");
      await loadInvoicesForAgreement(agreementId);
    } catch {
      message.error("Не удалось удалить инвойс");
    }
  };

  // ===== GTD CRUD =====
  const openCreateGtdModal = ({ invoiceId, agreementId }) => {
    setGtdContext({ invoiceId, agreementId });
    setEditingGtd(null);
    gtdForm.resetFields();
    gtdForm.setFieldsValue({ ...INITIAL_GTD_VALUES, gtd_date: dayjs() });
    setIsGtdModalOpen(true);
  };

  const openEditGtdModal = (record, { invoiceId, agreementId }) => {
    setGtdContext({ invoiceId, agreementId });
    setEditingGtd(record);
    gtdForm.setFieldsValue({
      gtd_number: record.gtd_number || "",
      gtd_date: record.gtd_date ? dayjs(record.gtd_date) : null,
      gtd_amount:
        record.gtd_amount !== undefined && record.gtd_amount !== null
          ? String(record.gtd_amount)
          : "",
      gtd_currency: record.gtd_currency || "USD",
      hs_code: record.hs_code || "",
      destination_country: record.destination_country || "",
      document_type: record.document_type || "gtd",
      sender_name: record.sender_name || "",
      sender_bank: record.sender_bank || "",
      sender_country: record.sender_country || "",
      document: [],
    });
    setIsGtdModalOpen(true);
  };

  const handleGtdSubmit = async () => {
    if (gtdSubmitting) return;
    if (!gtdContext.invoiceId) {
      message.error("Не найден инвойс для ГТД");
      return;
    }
    let values;
    try {
      values = await gtdForm.validateFields();
    } catch {
      return;
    }
    setGtdSubmitting(true);
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
        invoice_id: gtdContext.invoiceId,
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
          gtdContext.invoiceId,
          gtdContext.agreementId,
        );
        message.success("ГТД обновлён");
      } else {
        await createGtd(
          branchId,
          companyId,
          contractId,
          gtdContext.invoiceId,
          payload,
          gtdContext.agreementId,
        );
        message.success("ГТД создан");
      }

      setIsGtdModalOpen(false);
      gtdForm.resetFields();
      setEditingGtd(null);
      await loadGtdForInvoice(gtdContext.invoiceId, gtdContext.agreementId);
    } catch (err) {
      console.error("Ошибка сохранения ГТД:", err);
      const data = err?.response?.data;
      const backendMsg =
        (typeof data?.error === "string" && data.error) ||
        (typeof data?.detail === "string" && data.detail) ||
        (typeof data?.message === "string" && data.message) ||
        null;
      message.error(backendMsg || "Не удалось сохранить ГТД");
    } finally {
      setGtdSubmitting(false);
    }
  };

  const handleDeleteGtd = async (e, gtdId, invoiceId, agreementId) => {
    e?.stopPropagation?.();
    try {
      await deleteGtd(
        branchId,
        companyId,
        contractId,
        gtdId,
        invoiceId,
        agreementId,
      );
      message.success("ГТД удалён в корзину");
      await loadGtdForInvoice(invoiceId, agreementId);
    } catch {
      message.error("Не удалось удалить ГТД");
    }
  };

  // ===== PO CRUD =====
  const openCreatePoModal = ({ invoiceId, agreementId }) => {
    setPoContext({ invoiceId, agreementId });
    setEditingPo(null);
    poForm.resetFields();
    poForm.setFieldsValue({ ...INITIAL_PO_VALUES, operation_date: dayjs() });
    setIsPoModalOpen(true);
  };

  const openEditPoModal = (record, { invoiceId, agreementId }) => {
    setPoContext({ invoiceId, agreementId });
    setEditingPo(record);
    poForm.setFieldsValue({
      payment_order_number: record.payment_order_number || "",
      operation_date: record.operation_date
        ? dayjs(record.operation_date)
        : null,
      value_date: record.value_date ? dayjs(record.value_date) : null,
      amount:
        record.amount !== undefined && record.amount !== null
          ? String(record.amount)
          : "",
      currency: record.currency || "USD",
      payer: record.payer || "",
      receiver_name: record.receiver_name || "",
      receiver_bank: record.receiver_bank || "",
      receiver_country: record.receiver_country || "",
      payment_purpose: record.payment_purpose || "",
      sender_name: record.sender_name || "",
      sender_bank: record.sender_bank || "",
      sender_country: record.sender_country || "",
      document: [],
    });
    setIsPoModalOpen(true);
  };

  const handlePoSubmit = async () => {
    if (poSubmitting) return;
    if (!poContext.invoiceId) {
      message.error("Не найден инвойс для ПП");
      return;
    }
    let values;
    try {
      values = await poForm.validateFields();
    } catch {
      return;
    }
    setPoSubmitting(true);
    try {
      const payload = {
        payment_order_number: values.payment_order_number?.trim() || "",
        operation_date: values.operation_date?.format("YYYY-MM-DD") || null,
        value_date: values.value_date?.format("YYYY-MM-DD") || null,
        amount: values.amount
          ? Number(String(values.amount).replace(/\s|,/g, ""))
          : 0,
        currency: values.currency || "USD",
        payer: values.payer?.trim() || "",
        receiver_name: values.receiver_name?.trim() || "",
        receiver_bank: values.receiver_bank?.trim() || "",
        receiver_country: values.receiver_country || "",
        payment_purpose: values.payment_purpose?.trim() || "",
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
          poContext.invoiceId,
          editingPo.id,
          payload,
          poContext.agreementId,
        );
        message.success("ПП обновлено");
      } else {
        await createPaymentOrder(
          branchId,
          companyId,
          contractId,
          poContext.invoiceId,
          payload,
          poContext.agreementId,
        );
        message.success("ПП создано");
      }

      setIsPoModalOpen(false);
      poForm.resetFields();
      setEditingPo(null);
      await loadPoForInvoice(poContext.invoiceId, poContext.agreementId);
    } catch (err) {
      console.error("Ошибка сохранения ПП:", err);
      const data = err?.response?.data;
      const backendMsg =
        (typeof data?.error === "string" && data.error) ||
        (typeof data?.detail === "string" && data.detail) ||
        (typeof data?.message === "string" && data.message) ||
        null;
      message.error(backendMsg || "Не удалось сохранить ПП");
    } finally {
      setPoSubmitting(false);
    }
  };

  const handleDeletePo = async (e, poId, invoiceId, agreementId) => {
    e?.stopPropagation?.();
    try {
      await deletePaymentOrder(
        branchId,
        companyId,
        contractId,
        invoiceId,
        poId,
        agreementId,
      );
      message.success("ПП удалено в корзину");
      await loadPoForInvoice(invoiceId, agreementId);
    } catch {
      message.error("Не удалось удалить ПП");
    }
  };

  // ===== КОЛОНКИ: AGREEMENTS =====
  const agreementColumns = [
    {
      title: "Номер доп. соглашения",
      dataIndex: "agreement_number",
      key: "agreement_number",
      width: 220,
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
        <Text strong style={{ color: RED, fontSize: 14 }}>
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
      title: "Дата соглашения",
      dataIndex: "agreement_date",
      key: "agreement_date",
      width: 140,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: RED, fontSize: 12 }} />
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
          <CalendarOutlined style={{ color: RED, fontSize: 12 }} />
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
          <CalendarOutlined style={{ color: RED, fontSize: 12 }} />
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
      title: "Получатель",
      dataIndex: "receiver_name",
      key: "receiver_name",
      width: 180,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Space size={6}>
            <UserOutlined style={{ color: RED, fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
          </Space>
        </Tooltip>
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
      width: 160,
      render: (v) => (
        <Space size={6}>
          <GlobalOutlined style={{ color: RED, fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Страна получателя",
      dataIndex: "receiver_country",
      key: "receiver_country",
      width: 200,
      render: (v) => (
        <Space size={6}>
          <GlobalOutlined style={{ color: RED, fontSize: 12 }} />
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
    ...(canCreateEdit || canDelete
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 200,
            align: "center",
            render: (_, record) => (
              <Space size={4}>
                {canCreateEdit && (
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

  // ===== КОЛОНКИ: INVOICES (базовые) =====
  const invoiceBaseColumns = [
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
          <CalendarOutlined style={{ color: RED, fontSize: 12 }} />
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
      title: "Отправитель",
      dataIndex: "sender_name",
      key: "sender_name",
      width: 180,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
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
      width: 160,
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

  // ===== КОЛОНКИ: ГТД =====
  const buildGtdColumns = (invoiceId, agreementId) => [
    {
      title: "Номер ГТД",
      dataIndex: "gtd_number",
      width: 150,
      render: (v) => <Text strong>{v || "—"}</Text>,
    },
    {
      title: "Дата",
      dataIndex: "gtd_date",
      width: 120,
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
      width: 150,
      render: (v, r) => (
        <Text strong style={{ color: "#d946ef", fontSize: 13 }}>
          {formatMoney(v, r.gtd_currency)}
        </Text>
      ),
    },
    {
      title: "ТН ВЭД",
      dataIndex: "hs_code",
      width: 110,
      render: (v) => (
        <Tag color="blue" style={{ borderRadius: 8 }}>
          {v || "—"}
        </Tag>
      ),
    },
    {
      title: "Страна поступления",
      dataIndex: "destination_country",
      width: 200,
      render: (v) => (
        <Space size={6}>
          <GlobalOutlined style={{ color: RED, fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Документ",
      dataIndex: "document_path",
      width: 220,
      render: (v, record) => (
        <DocumentLink entityType="gtd" entityId={record.id} filePath={v} />
      ),
    },
    ...(canCreateEdit || canDelete
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 100,
            align: "center",
            render: (_, record) => (
              <Space size={4}>
                {canCreateEdit && (
                  <Tooltip title="Редактировать">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined style={{ color: RED }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditGtdModal(record, { invoiceId, agreementId });
                      }}
                    />
                  </Tooltip>
                )}
                {canDelete && (
                  <Popconfirm
                    title="Удалить ГТД?"
                    okText="Удалить"
                    cancelText="Отмена"
                    okButtonProps={{ danger: true }}
                    onConfirm={(e) =>
                      handleDeleteGtd(e, record.id, invoiceId, agreementId)
                    }
                    onCancel={(e) => e?.stopPropagation?.()}
                  >
                    <Tooltip title="Удалить">
                      <Button
                        type="text"
                        size="small"
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

  const buildPoColumns = (invoiceId, agreementId) => [
    {
      title: "Номер ПП",
      dataIndex: "payment_order_number",
      width: 150,
      render: (v) => <Text strong>{v || "—"}</Text>,
    },
    {
      title: "Дата операции",
      dataIndex: "operation_date",
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
      dataIndex: "amount",
      width: 150,
      render: (v, r) => (
        <Text strong style={{ color: "#d946ef", fontSize: 13 }}>
          {formatMoney(v, r.currency)}
        </Text>
      ),
    },
    {
      title: "Плательщик",
      dataIndex: "payer",
      width: 160,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Получатель",
      dataIndex: "receiver_name",
      width: 160,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Банк получателя",
      dataIndex: "receiver_bank",
      width: 160,
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
      title: "Назначение",
      dataIndex: "payment_purpose",
      width: 200,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Tooltip>
      ),
    },
    // {
    //   title: "Документ",
    //   dataIndex: "document_path",
    //   width: 220,
    //   render: (v, record) => (
    //     <DocumentLink
    //       entityType="payment-order"
    //       entityId={record.id}
    //       filePath={v}
    //     />
    //   ),
    // },
    ...(canCreateEdit || canDelete
      ? [
          {
            title: "Действие",
            key: "actions",
            width: 100,
            align: "center",
            render: (_, record) => (
              <Space size={4}>
                {canCreateEdit && (
                  <Tooltip title="Редактировать">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined style={{ color: RED }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPoModal(record, { invoiceId, agreementId });
                      }}
                    />
                  </Tooltip>
                )}
                {canDelete && (
                  <Popconfirm
                    title="Удалить ПП?"
                    okText="Удалить"
                    cancelText="Отмена"
                    okButtonProps={{ danger: true }}
                    onConfirm={(e) =>
                      handleDeletePo(e, record.id, invoiceId, agreementId)
                    }
                    onCancel={(e) => e?.stopPropagation?.()}
                  >
                    <Tooltip title="Удалить">
                      <Button
                        type="text"
                        size="small"
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

  // ===== РАСШИРЯЕМАЯ СТРОКА ИНВОЙСА: ГТД + ПП =====
  const invoiceExpandedRowRender = (invoiceRecord, agreementId) => {
    const invoiceId = invoiceRecord.id;
    const gtdList = gtdByInvoice[invoiceId] || [];
    const poList = poByInvoice[invoiceId] || [];
    const gtdLoading = loadingGtdMap[invoiceId] || false;
    const poLoading = loadingPoMap[invoiceId] || false;

    return (
      <div style={{ padding: "8px 12px", background: "#fffbfb" }}>
        {/* ===== ГТД ===== */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Space size={10}>
            <GlobalOutlined style={{ color: RED }} />
            <Text strong style={{ color: RED }}>
              ГТД
            </Text>
            <Tag color="red" style={{ borderRadius: 8 }}>
              {gtdList.length}
            </Tag>
          </Space>
          {canCreateEdit && (
            <Button
              size="middle"
              type="primary"
              danger
              icon={<PlusOutlined />}
              onClick={() => openCreateGtdModal({ invoiceId, agreementId })}
              style={{ background: RED, border: "none", borderRadius: 8 }}
            >
              Добавить ГТД
            </Button>
          )}
        </div>
        <Table
          className="red-table"
          rowKey={(r) => `gtd-${r.id ?? Math.random()}`}
          size="large"
          loading={gtdLoading}
          columns={buildGtdColumns(invoiceId, agreementId)}
          dataSource={gtdList}
          pagination={false}
          scroll={{ x: "max-content" }}
          style={{ marginBottom: 16 }}
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

        {/* ===== ПП ===== */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Space size={10}>
            <DollarOutlined style={{ color: RED }} />
            <Text strong style={{ color: RED }}>
              Платёжные поручения
            </Text>
            <Tag color="red" style={{ borderRadius: 8 }}>
              {poList.length}
            </Tag>
          </Space>
          {canCreateEdit && (
            <Button
              size="middle"
              type="primary"
              danger
              icon={<PlusOutlined />}
              onClick={() => openCreatePoModal({ invoiceId, agreementId })}
              style={{ background: RED, border: "none", borderRadius: 8 }}
            >
              Добавить ПП
            </Button>
          )}
        </div>
        <Table
          className="red-table"
          rowKey={(r) => `po-${r.id ?? Math.random()}`}
          size="large"
          loading={poLoading}
          columns={buildPoColumns(invoiceId, agreementId)}
          dataSource={poList}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ color: "#999" }}>ПП пока нет</span>}
              />
            ),
          }}
        />
      </div>
    );
  };

  // ===== РАСШИРЯЕМАЯ СТРОКА AGREEMENT: инвойсы =====
  const expandedRowRender = (agreementRecord) => {
    const agreementId = agreementRecord.id;
    const agreementInvoices = invoicesByAgreement[agreementId] || [];
    const isLoadingThis = loadingInvoicesMap[agreementId] || false;

    const actionsColumn = {
      title: "Действие",
      key: "actions",
      width: 160,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          {canCreateEdit && (
            <Tooltip title="Редактировать">
              <Button
                type="text"
                icon={<EditOutlined style={{ color: RED }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditInvoiceModal(record, agreementId);
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
              onConfirm={(e) => handleDeleteInvoice(e, record.id, agreementId)}
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
    };

    const columns =
      canCreateEdit || canDelete
        ? [...invoiceBaseColumns, actionsColumn]
        : invoiceBaseColumns;

    return (
      <div style={{ padding: "16px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Space size={10}>
            <FileTextOutlined style={{ color: RED, fontSize: 16 }} />
            <Text strong style={{ fontSize: 14, color: RED }}>
              Инвойсы соглашения
            </Text>
            <Tag color="red" style={{ borderRadius: 8 }}>
              {agreementInvoices.length}
            </Tag>
          </Space>
          {canCreateEdit && (
            <Button
              danger
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => openCreateInvoiceModal(agreementId)}
              style={{
                height: 30,
                borderRadius: 8,
                background: RED,
                border: "none",
                fontWeight: 600,
              }}
            >
              Создать инвойс
            </Button>
          )}
        </div>
        <Table
          className="red-table"
          rowKey={(r) => String(r.id ?? Math.random())}
          loading={isLoadingThis}
          columns={columns}
          dataSource={agreementInvoices}
          pagination={false}
          size="large"
          expandable={{
            expandedRowRender: (invoiceRecord) =>
              invoiceExpandedRowRender(invoiceRecord, agreementId),
            onExpand: (expanded, invoiceRecord) => {
              if (expanded) {
                loadGtdForInvoice(invoiceRecord.id, agreementId);
                loadPoForInvoice(invoiceRecord.id, agreementId);
              }
            },
            expandIcon: ({ expanded, onExpand, record }) => (
              <Button
                type="text"
                size="small"
                icon={expanded ? <MinusOutlined /> : <PlusOutlined />}
                onClick={(e) => onExpand(record, e)}
                style={{ color: RED }}
              />
            ),
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
      </div>
    );
  };

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

      {/* ===== ТАБЛИЦА ДОП. СОГЛАШЕНИЙ ===== */}
      <Card
        style={{
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          overflow: "hidden",
          marginBottom: 24,
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
              <Spin size="middle" />
            </div>
          ) : (
            <Table
              className="red-table"
              rowKey={(r) => String(r.id ?? Math.random())}
              loading={isLoading}
              columns={agreementColumns}
              dataSource={safeAgreements}
              scroll={{ x: "max-content" }}
              expandable={{
                expandedRowRender,
                onExpand: (expanded, record) => {
                  if (expanded) loadInvoicesForAgreement(record.id);
                },
                expandIcon: ({ expanded, onExpand, record }) => (
                  <Button
                    type="text"
                    icon={expanded ? <MinusOutlined /> : <PlusOutlined />}
                    onClick={(e) => onExpand(record, e)}
                    style={{ color: RED, fontSize: 14, borderRadius: "50%" }}
                  />
                ),
              }}
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

      {/* ===== МОДАЛКА AGREEMENT ===== */}
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
        styles={{ body: { maxHeight: "calc(130vh - 20px)" } }}
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
          initialValues={INITIAL_AGREEMENT_VALUES}
        >
          <Divider orientation="left" style={{ marginTop: 0 }}>
            <Space>
              <FileTextOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
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
                rules={[
                  { required: true, message: "Введите предмет соглашения" },
                ]}
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
              <DollarOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
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
                  { pattern: /^\d+([.,]\d+)?$/, message: "Введите сумму" },
                ]}
              >
                <Input
                  placeholder="Введите сумму"
                  style={{ borderRadius: 10 }}
                  prefix={<DollarOutlined style={{ color: RED }} />}
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
              <UserOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
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
                  prefix={<UserOutlined style={{ color: RED }} />}
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
                  prefix={<BankOutlined style={{ color: RED }} />}
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
              <SendOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
                Отправитель
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={8}>
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
            <Col span={8}>
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
            <Col span={8}>
              <Form.Item
                label="Страна отправителя"
                name="sender_country"
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

          <Divider orientation="left">
            <Space>
              <FileDoneOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
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
                  editingAgreement?.document_path ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Текущий файл:{" "}
                      <Text code style={{ fontSize: 11 }}>
                        {String(editingAgreement.document_path)
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

      {/* ===== МОДАЛКА INVOICE ===== */}
      <Modal
        title={
          <span style={{ fontWeight: 700, color: RED, fontSize: 17 }}>
            {editingInvoice ? "Редактировать инвойс" : "Создать инвойс"}
          </span>
        }
        open={isInvoiceModalOpen}
        onCancel={() => {
          if (!invoiceSubmitting) {
            setIsInvoiceModalOpen(false);
            setEditingInvoice(null);
          }
        }}
        afterClose={() => {
          invoiceForm.resetFields();
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
            loading={invoiceSubmitting}
            onClick={handleInvoiceSubmit}
            style={{
              borderRadius: 10,
              height: 35,
              background: RED,
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
            disabled={invoiceSubmitting}
            onClick={() => {
              setIsInvoiceModalOpen(false);
              setEditingInvoice(null);
            }}
            style={{ borderRadius: 10, height: 34 }}
          >
            Отмена
          </Button>,
        ]}
      >
        <Form
          form={invoiceForm}
          layout="vertical"
          autoComplete="off"
          initialValues={INITIAL_INVOICE_VALUES}
        >
          <Divider orientation="left" style={{ marginTop: 0 }}>
            <Space>
              <FileTextOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
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
              <DollarOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
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
                  prefix={<DollarOutlined style={{ color: RED }} />}
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
            <Col span={10}>
              <Form.Item label="Код ТН ВЭД (HS CODE)" name="hs_code">
                <Input
                  placeholder="Введите код ТН ВЭД"
                  style={{ borderRadius: 10 }}
                  prefix={<GlobalOutlined style={{ color: RED }} />}
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
            <Col span={10}>
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
            <Col span={10}>
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
            <Col span={10}>
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
                    Поддерживается PDF
                  </p>
                </Upload.Dragger>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ===== МОДАЛКА ГТД ===== */}
      <Modal
        title={
          <span style={{ fontWeight: 700, color: RED, fontSize: 17 }}>
            {editingGtd ? "Редактировать ГТД" : "Создать ГТД"}
          </span>
        }
        open={isGtdModalOpen}
        onCancel={() => {
          if (!gtdSubmitting) {
            setIsGtdModalOpen(false);
            setEditingGtd(null);
          }
        }}
        afterClose={() => {
          gtdForm.resetFields();
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
            loading={gtdSubmitting}
            onClick={handleGtdSubmit}
            style={{
              borderRadius: 10,
              height: 35,
              background: RED,
              border: "none",
              fontWeight: 600,
            }}
          >
            {editingGtd ? "Сохранить изменения" : "Сохранить"}
          </Button>,
          <Button
            key="cancel"
            danger
            icon={<CloseOutlined />}
            disabled={gtdSubmitting}
            onClick={() => {
              setIsGtdModalOpen(false);
              setEditingGtd(null);
            }}
            style={{ borderRadius: 10, height: 35 }}
          >
            Отмена
          </Button>,
        ]}
      >
        <Form form={gtdForm} layout="vertical" autoComplete="off">
          <Divider orientation="left" style={{ marginTop: 0 }}>
            <Space>
              <GlobalOutlined style={{ color: RED }} />
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
                        {String(editingGtd.document_path)
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

      {/* ===== МОДАЛКА ПП ===== */}
      <Modal
        title={
          <span style={{ fontWeight: 700, color: RED, fontSize: 17 }}>
            {editingPo
              ? "Редактировать платёжное поручение"
              : "Создать платёжное поручение"}
          </span>
        }
        open={isPoModalOpen}
        onCancel={() => {
          if (!poSubmitting) {
            setIsPoModalOpen(false);
            setEditingPo(null);
          }
        }}
        afterClose={() => {
          poForm.resetFields();
          setEditingPo(null);
        }}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        forceRender
        width={900}
        style={{ top: 60 }}
        styles={{ body: { maxHeight: "calc(100vh - 120px)" } }}
        footer={[
          <Button
            key="submit"
            danger
            type="primary"
            icon={<CheckOutlined />}
            loading={poSubmitting}
            onClick={handlePoSubmit}
            style={{
              borderRadius: 10,
              height: 35,
              background: RED,
              border: "none",
              fontWeight: 600,
            }}
          >
            {editingPo ? "Сохранить изменения" : "Сохранить"}
          </Button>,
          <Button
            key="cancel"
            danger
            icon={<CloseOutlined />}
            disabled={poSubmitting}
            onClick={() => {
              setIsPoModalOpen(false);
              setEditingPo(null);
            }}
            style={{ borderRadius: 10, height: 35 }}
          >
            Отмена
          </Button>,
        ]}
      >
        <Form form={poForm} layout="vertical" autoComplete="off">
          <Divider orientation="left" style={{ marginTop: 0 }}>
            <Space>
              <DollarOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
                Основная информация
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Номер ПП"
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Дата валютирования" name="value_date">
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
              <Form.Item
                label="Плательщик"
                name="payer"
                rules={[{ required: true, message: "Введите плательщика" }]}
              >
                <Input
                  placeholder="Введите плательщика"
                  style={{ borderRadius: 10 }}
                  prefix={<UserOutlined style={{ color: RED }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Назначение платежа" name="payment_purpose">
                <Input
                  placeholder="Введите назначение"
                  style={{ borderRadius: 10 }}
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
              <Form.Item label="Название отправителя" name="sender_name">
                <Input
                  placeholder="Введите название отправителя"
                  style={{ borderRadius: 10 }}
                  prefix={<SendOutlined style={{ color: RED }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Банк отправителя" name="sender_bank">
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
              <Form.Item label="Страна отправителя" name="sender_country">
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
              <UserOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
                Получатель
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Название получателя"
                name="receiver_name"
                rules={[{ required: true, message: "Введите название" }]}
              >
                <Input
                  placeholder="Введите название получателя"
                  style={{ borderRadius: 10 }}
                  prefix={<UserOutlined style={{ color: RED }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Банк получателя"
                name="receiver_bank"
                rules={[{ required: true, message: "Введите банк" }]}
              >
                <Input
                  placeholder="Введите банк получателя"
                  style={{ borderRadius: 10 }}
                  prefix={<BankOutlined style={{ color: RED }} />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Страна получателя"
                name="receiver_country"
                rules={[{ required: true, message: "Выберите страну" }]}
              >
                <Select
                  showSearch
                  placeholder="Выберите страну получателя"
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

          {/* <Divider orientation="left">
            <Space>
              <FileDoneOutlined style={{ color: RED }} />
              <Text strong style={{ color: RED }}>
                Документ
              </Text>
            </Space>
          </Divider> */}

          {/* <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={
                  editingPo
                    ? "Загрузить новый PDF (опционально)"
                    : "Загрузить PDF (обязательно)"
                }
                name="document"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={
                  editingPo
                    ? []
                    : [{ required: true, message: "Загрузите PDF документ" }]
                }
                extra={
                  editingPo?.document_path ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Текущий файл:{" "}
                      <Text code style={{ fontSize: 11 }}>
                        {String(editingPo.document_path)
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
          </Row> */}
        </Form>
      </Modal>
    </div>
  );
};

export default AdditionalAgreements;