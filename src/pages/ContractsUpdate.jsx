import {
  useEffect,
  useState,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
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
  ConfigProvider,
} from "antd";

import {
  FileTextOutlined,
  PlusOutlined,
  MinusOutlined,
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
  FileAddOutlined,
  CreditCardOutlined,
  SendOutlined,
  FilePdfOutlined,
  FieldTimeOutlined,
  EyeOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useContractStore } from "../store/useContractStore";
import { useInvoiceStore } from "../store/useInvoiceStore";
import { useGtdStore } from "../store/useGtdStore";
import { usePaymentOrderStore } from "../store/usePaymentOrderStore";
import { useActStore } from "../store/useActStore";
import { useAdditionalAgreementsStore } from "../store/useAdditionalAgreementsStore";
import { useAuthStore } from "../store/useAuth";
import { useBranchDashboardStore } from "../store/useBranchDashboard";
import { useDocPermissions } from "../store/useDocPermissions";
import { searchCountries, searchCurrencies } from "../api/dictionary.service";
import DocumentLink from "../pages/DocumentLink";
import {
  GtdExtendModal,
  GtdExtensionHistoryModal,
} from "../pages/GtdExtensionModals";

const { Title, Text } = Typography;

const RED = "#8b0000";

const NO_ANIMATION_CSS = `
*, *::before, *::after {
  animation: none !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition: none !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  scroll-behavior: auto !important;
}

/* Колонка с +/- : компактная и слева (и у контрактов, и у инвойсов) */
.red-table .ant-table-row-expand-icon-cell,
.red-table .ant-table-thead > tr > th.ant-table-row-expand-icon-cell {
  padding-left: 8px !important;
  padding-right: 0 !important;
  width: 40px !important;
  min-width: 40px !important;
  max-width: 40px !important;
  text-align: left !important;
}

/* Чуть уменьшаем отступы в ячейках, чтобы таблица была компактнее */
.red-table .ant-table-cell {
  padding: 4px 8px !important;
}

/* Каждый контракт отделён жирной линией сверху */
.red-table .contract-row > td {
  border-top: 3px solid #8b0000 !important;
}

/* Каждый инвойс отделён красной линией сверху */
.red-table .invoice-row > td {
  border-top: 4px solid #8b0000 !important;
}
`;

const STATUS_MAP = {
  draft: { label: "Черновик", color: "default" },
  active: { label: "Активный", color: "green" },
  completed: { label: "Завершён", color: "blue" },
  cancelled: { label: "Отменён", color: "red" },
  archived: { label: "В архиве", color: "purple" },
};

const APPROVAL_STATUS_MAP = {
  pending: { label: "В ожидании", color: "gold" },
  pending_currency_control: { label: "На валютном контроле", color: "orange" },
  pending_compliance: { label: "На комплаенсе", color: "purple" },
  revision: { label: "На доработке", color: "volcano" },
  approved: { label: "Одобрено", color: "green" },
  accepted: { label: "Принято", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
  declined: { label: "Отклонено", color: "red" },
  archived: { label: "В архиве", color: "default" },
};

const DECISION_MAP = {
  approve: { label: "Одобрено", color: "green" },
  accepted: { label: "Принято", color: "green" },
  reject: { label: "Отклонено", color: "red" },
  rejected: { label: "Отклонено", color: "red" },
  revision: { label: "На доработке", color: "orange" },
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value?.results && Array.isArray(value.results)) return value.results;
  if (value?.data && Array.isArray(value.data)) return value.data;
  if (value?.items && Array.isArray(value.items)) return value.items;
  return [];
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

const sameId = (a, b) =>
  a === null || a === undefined || String(a) === String(b);

// ---------- Чистый текст ошибки (без {"error": ...}) ----------
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

const errMsg = (err, fallback) =>
  cleanErrorText(err?.response?.data) || fallback;

// ---------- Доп. соглашения: очередь запросов + кэш ----------
const agreementsCache = new Map(); // contractId -> массив доп. соглашений
let agreementsQueue = Promise.resolve();

const loadAgreementsQueued = (branchId, companyId, contractId) => {
  const key = String(contractId);
  if (agreementsCache.has(key)) {
    return Promise.resolve(agreementsCache.get(key));
  }

  const task = agreementsQueue.then(async () => {
    if (agreementsCache.has(key)) return agreementsCache.get(key);
    const st = useAdditionalAgreementsStore.getState();
    const res = await st.fetchAgreements(branchId, companyId, contractId);
    const raw =
      res !== undefined && res !== null
        ? toArray(res)
        : toArray(useAdditionalAgreementsStore.getState().agreements);
    const list = raw.filter(
      (a) => a?.contract_id == null || sameId(a.contract_id, contractId),
    );
    agreementsCache.set(key, list);
    return list;
  });

  agreementsQueue = task.catch(() => {});
  return task;
};

const statusTag = (map, v) => {
  const info = map[v] || { label: v || "—", color: "default" };
  return (
    <Tag
      color={info.color}
      style={{ borderRadius: 8, fontWeight: 500, padding: "2px 10px" }}
    >
      {info.label}
    </Tag>
  );
};

const dateCell = (v, color = RED) => (
  <Space size={4}>
    <CalendarOutlined style={{ color, fontSize: 12 }} />
    <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
  </Space>
);

const textCell = (v, Icon) => (
  <Tooltip title={v} placement="topLeft">
    <Space size={6}>
      {Icon && <Icon style={{ color: RED, fontSize: 12 }} />}
      <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
    </Space>
  </Tooltip>
);

// ---------- Согласование (статус + решения Комплаенса и Валютного контроля) ----------
const decisionLine = (label, decision, comment) => {
  let info = decision
    ? DECISION_MAP[decision] || { label: decision, color: "default" }
    : { label: "Ожидает", color: "default" };

  // Принудительно задаем нужные тексты для Комплаенса и Вал. контроля, если решение положительное
  const isApproved = ["approve", "approved", "accepted"].includes(decision);

  if (isApproved) {
    if (label === "Комплаенс") {
      info = { label: "Принято", color: "green" };
    }
    if (label === "Вал. контроль") {
      info = { label: "Принято", color: "green" };
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Text type="secondary" style={{ fontSize: 12, minWidth: 100 }}>
        {label}:
      </Text>
      <Tooltip title={comment || null}>
        <Tag
          color={info.color}
          style={{
            borderRadius: 8,
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            padding: "2px 12px",
          }}
        >
          {info.label}
        </Tag>
      </Tooltip>
    </div>
  );
};
const approvalCell = (r) => (
  <Space orientation="vertical" size={6}>
    {statusTag(APPROVAL_STATUS_MAP, r.approval_status)}
    {decisionLine("Комплаенс", r.compliance_decision, r.compliance_comment)}
    {decisionLine(
      "Вал. контроль",
      r.currency_control_decision,
      r.currency_control_comment,
    )}
  </Space>
);

// Отдельная колонка согласования для ГТД
const gtdApprovalColumn = {
  title: "Согласование ГТД",
  dataIndex: "approval_status",
  key: "gtd_approval",
  width: 180,
  render: (_, r) => approvalCell(r),
};

// Отдельная колонка согласования для платёжных поручений
const poApprovalColumn = {
  title: "Согласование ПП",
  dataIndex: "approval_status",
  key: "po_approval",
  width: 200,
  render: (_, r) => approvalCell(r),
};

const expandIcon = ({ expanded, onExpand, record }) => (
  <Button
    type="text"
    size="small"
    style={{ padding: 0, margin: 0, width: 24 }}
    icon={
      expanded ? (
        <MinusOutlined style={{ color: RED }} />
      ) : (
        <PlusOutlined style={{ color: RED }} />
      )
    }
    onClick={(e) => {
      e.stopPropagation();
      onExpand(record, e);
    }}
  />
);

const emptyLocale = (text) => ({
  emptyText: (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={<span style={{ color: "#999" }}>{text}</span>}
    />
  ),
});

const INITIAL_FORM_VALUES = {
  contract_currency: undefined,
  status: "draft",
  approval_status: "pending",
  remaining_amount: 0,
  total_amount: "",
  return_days: "",
  sender_name: "Актив Банк",
  sender_bank: "Актив Банк",
  sender_country: "Таджикистан",
  receiver_country: undefined,
};

const Ctx = createContext(null);

const filterByLabel = (input, option) =>
  String(option?.label || "")
    .toLowerCase()
    .includes(String(input || "").toLowerCase());

const Section = ({ icon, title }) => (
  <Divider orientation="left">
    <Space>
      {icon}
      <Text strong style={{ color: RED }}>
        {title}
      </Text>
    </Space>
  </Divider>
);

const FormModal = ({
  title,
  submitting,
  onOk,
  onCancel,
  width = 900,
  children,
}) => (
  <div onClick={(e) => e.stopPropagation()}>
    <Modal
      open
      destroyOnClose
      maskClosable={false}
      keyboard={false}
      width={width}
      style={{ top: 30 }}
      styles={{ body: { maxHeight: "calc(120vh - 200px)" } }}
      title={
        <span style={{ fontWeight: 700, color: RED, fontSize: 17 }}>
          {title}
        </span>
      }
      onCancel={() => !submitting && onCancel()}
      footer={[
        <Button
          key="submit"
          danger
          type="primary"
          icon={<CheckOutlined />}
          loading={submitting}
          onClick={onOk}
          style={{
            borderRadius: 10,
            height: 35,
            background: RED,
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
          disabled={submitting}
          onClick={onCancel}
          style={{ borderRadius: 10, height: 35 }}
        >
          Отмена
        </Button>,
      ]}
    >
      {children}
    </Modal>
  </div>
);

// Поле загрузки PDF.
// required — файл обязателен. При редактировании файл нужен только если
// у записи ещё нет документа (если он уже есть, поле можно оставить пустым).
const PdfField = ({ editing, currentPath, required = false }) => {
  const mustUpload = required && !(editing && currentPath);

  return (
    <Form.Item
      label={
        editing
          ? `Загрузить новый PDF${mustUpload ? "" : " (опционально)"}`
          : `Загрузить PDF${required ? "" : " (опционально)"}`
      }
      name="document"
      valuePropName="fileList"
      getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
      rules={
        mustUpload
          ? [
              {
                required: true,
                type: "array",
                min: 1,
                message: "Загрузите PDF документ",
              },
            ]
          : []
      }
      extra={
        currentPath ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Текущий файл:{" "}
            <Text code style={{ fontSize: 11 }}>
              {String(currentPath).split(/[\\/]/).pop()}
            </Text>
          </Text>
        ) : null
      }
    >
      <Upload.Dragger
        beforeUpload={() => false}
        maxCount={1}
        accept=".pdf"
        style={{ borderRadius: 12, background: "#fafafa", borderColor: RED }}
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
        <p className="ant-upload-hint" style={{ fontSize: 12, color: "#999" }}>
          Поддерживается только PDF
        </p>
      </Upload.Dragger>
    </Form.Item>
  );
};

const CurrencySelect = (props) => {
  const { currencyOptions, loadingCurrencies } = useContext(Ctx);
  return (
    <Select
      showSearch
      placeholder="Выберите валюту"
      style={{ borderRadius: 10, border: "1px solid #8b0000" }}
      loading={loadingCurrencies}
      filterOption={filterByLabel}
      options={currencyOptions}
      notFoundContent={loadingCurrencies ? "Загрузка…" : "Ничего не найдено"}
      {...props}
    />
  );
};

const CountrySelect = ({ placeholder = "Выберите страну", ...props }) => {
  const { countryOptions, loadingCountries } = useContext(Ctx);
  return (
    <Select
      showSearch
      allowClear
      placeholder={placeholder}
      style={{ borderRadius: 10, border: "1px solid #8b0000" }}
      loading={loadingCountries}
      filterOption={filterByLabel}
      options={countryOptions}
      notFoundContent={loadingCountries ? "Загрузка…" : "Ничего не найдено"}
      {...props}
    />
  );
};

const SenderFields = ({ span = 8 }) => (
  <>
    <Section
      icon={<SendOutlined style={{ color: RED }} />}
      title="Отправитель"
    />
    <Row gutter={16}>
      <Col span={span}>
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
    </Row>
  </>
);

const formatAmount = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const [int, dec] = String(value).split(".");
  const withSpaces = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${withSpaces}.${dec}` : withSpaces;
};

const AmountInput = (props) => (
  <InputNumber
    style={{ width: "100%", borderRadius: 10 }}
    placeholder="Введите сумму"
    min={0}
    formatter={formatAmount}
    parser={(value) => String(value || "").replace(/\$\s?|(,*)/g, "")}
    prefix={<DollarOutlined style={{ color: RED }} />}
    {...props}
  />
);

const DateInput = ({ placeholder = "Выберите дату", ...props }) => (
  <DatePicker
    placeholder={placeholder}
    style={{ width: "100%", borderRadius: 10 }}
    format="YYYY-MM-DD"
    {...props}
  />
);

const useFormSubmit = (form, run, onSaved, onClose) => {
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (submitting) return;
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    let ok = false;
    try {
      await run(values);
      ok = true;
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      message.error({
        content: errMsg(err, "Не удалось сохранить"),
        key: "form-save-error",
      });
    } finally {
      setSubmitting(false);
    }
    if (ok) {
      onSaved?.();
      onClose();
    }
  };
  return { submitting, submit };
};

const InvoiceFormModal = ({ contractId, record, onClose, onSaved }) => {
  const { branchId, companyId } = useContext(Ctx);
  const [form] = Form.useForm();
  const editing = !!record;

  const { submitting, submit } = useFormSubmit(
    form,
    async (values) => {
      const fd = new FormData();
      fd.append("invoice_number", String(values.invoice_number || "").trim());
      fd.append(
        "invoice_date",
        dayjs(values.invoice_date).format("YYYY-MM-DD"),
      );
      fd.append("amount", String(Number(values.amount)));
      fd.append("currency", String(values.currency || ""));
      fd.append("hs_code", String(values.hs_code || "").trim());
      fd.append("sender_name", String(values.sender_name || "").trim());
      fd.append("sender_bank", String(values.sender_bank || "").trim());
      fd.append("sender_country", String(values.sender_country || "").trim());
      const file = values?.document?.[0]?.originFileObj;
      if (file) fd.append("document", file);

      const st = useInvoiceStore.getState();
      if (editing) {
        await st.updateInvoice(branchId, companyId, contractId, record.id, fd);
        message.success("Инвойс успешно обновлён");
      } else {
        await st.createInvoice(branchId, companyId, contractId, fd);
        message.success("Инвойс успешно создан");
      }
    },
    onSaved,
    onClose,
  );

  const initial = editing
    ? {
        invoice_number: record.invoice_number || "",
        invoice_date: record.invoice_date ? dayjs(record.invoice_date) : null,
        amount: record.amount ?? "",
        currency: record.currency || "USD",
        hs_code: record.hs_code || "",
        sender_name: record.sender_name || "Актив Банк",
        sender_bank: record.sender_bank || "Актив Банк",
        sender_country: record.sender_country || "Таджикистан",
        document: [],
      }
    : {
        currency: undefined,
        invoice_date: undefined,
        sender_name: "Актив Банк",
        sender_bank: "Актив Банк",
        sender_country: "Таджикистан",
        document: [],
      };

  return (
    <FormModal
      title={editing ? "Редактировать инвойс" : "Создать новый инвойс"}
      submitting={submitting}
      onOk={submit}
      onCancel={onClose}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        initialValues={initial}
      >
        <Section
          icon={<FileTextOutlined style={{ color: RED }} />}
          title="Основная информация"
        />
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
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Дата инвойса"
              name="invoice_date"
              rules={[{ required: true, message: "Выберите дату инвойса" }]}
            >
              <DateInput />
            </Form.Item>
          </Col>
        </Row>

        <Section
          icon={<DollarOutlined style={{ color: RED }} />}
          title="Финансы"
        />
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Сумма инвойса"
              name="amount"
              rules={[{ required: true, message: "Введите сумму" }]}
            >
              <AmountInput />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Валюта инвойса"
              name="currency"
              rules={[{ required: true, message: "Выберите валюту" }]}
            >
              <CurrencySelect />
            </Form.Item>
          </Col>
        </Row>

        <Section
          icon={<FileDoneOutlined style={{ color: RED }} />}
          title="Документ"
        />
        <Row gutter={16}>
          <Col span={12}>
            {/* Документ инвойса обязателен */}
            <PdfField
              required
              editing={editing}
              currentPath={record?.document_path}
            />
          </Col>
        </Row>
      </Form>
    </FormModal>
  );
};

const GtdFormModal = ({ contractId, invoiceId, record, onClose, onSaved }) => {
  const { branchId, companyId } = useContext(Ctx);
  const [form] = Form.useForm();
  const editing = !!record;

  const { submitting, submit } = useFormSubmit(
    form,
    async (values) => {
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
        invoice_id: invoiceId || null,
        sender_name: values.sender_name?.trim() || "",
        sender_bank: values.sender_bank?.trim() || "",
        sender_country: values.sender_country || "",
        document: values.document?.[0]?.originFileObj || null,
      };
      const st = useGtdStore.getState();
      if (editing) {
        await st.updateGtd(branchId, companyId, contractId, record.id, payload);
        message.success("ГТД успешно обновлён");
      } else {
        await st.createGtd(branchId, companyId, contractId, invoiceId, payload);
        message.success("ГТД успешно создан");
      }
    },
    onSaved,
    onClose,
  );

  const initial = editing
    ? {
        ...record,
        gtd_date: record.gtd_date ? dayjs(record.gtd_date) : null,
        gtd_amount: record.gtd_amount ?? "",
        sender_name: record.sender_name || "Актив Банк",
        sender_bank: record.sender_bank || "Актив Банк",
        sender_country: record.sender_country || "Таджикистан",
        document: [],
      }
    : {
        gtd_currency: undefined,
        document_type: "gtd",
        gtd_date: undefined,
        sender_name: "Актив Банк",
        sender_bank: "Актив Банк",
        sender_country: "Таджикистан",
      };

  return (
    <FormModal
      title={editing ? "Редактировать ГТД" : "Создать ГТД"}
      submitting={submitting}
      onOk={submit}
      onCancel={onClose}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        initialValues={initial}
      >
        <Section
          icon={<FileTextOutlined style={{ color: RED }} />}
          title="Основная информация"
        />
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
              <DateInput />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Сумма ГТД"
              name="gtd_amount"
              rules={[{ required: true, message: "Введите сумму" }]}
            >
              <AmountInput />
            </Form.Item>
          </Col>
        </Row>

        <Section
          icon={<FileDoneOutlined style={{ color: RED }} />}
          title="Документ"
        />
        <Row gutter={16}>
          <Col span={12}>
            {/* Документ ГТД теперь обязателен */}
            <PdfField
              required
              editing={editing}
              currentPath={record?.document_path}
            />
          </Col>
        </Row>
      </Form>
    </FormModal>
  );
};

// ФОРМА ДЛЯ АКТА
const ActFormModal = ({ contractId, invoiceId, record, onClose, onSaved }) => {
  const { branchId, companyId } = useContext(Ctx);
  const [form] = Form.useForm();
  const editing = !!record;
  const { createAct, updateAct } = useActStore();

  const { submitting, submit } = useFormSubmit(
    form,
    async (values) => {
      const fd = new FormData();
      fd.append("act_number", String(values.act_number || "").trim());
      fd.append("act_date", dayjs(values.act_date).format("YYYY-MM-DD"));
      fd.append("act_amount", String(Number(values.act_amount)));
      const file = values?.document?.[0]?.originFileObj;
      if (file) fd.append("document", file);

      if (editing) {
        await updateAct(branchId, companyId, contractId, record.id, fd);
        message.success("Акт успешно обновлён");
      } else {
        await createAct(branchId, companyId, contractId, invoiceId, fd);
        message.success("Акт успешно создан");
      }
    },
    onSaved,
    onClose,
  );

  const initial = editing
    ? {
        ...record,
        act_date: record.act_date ? dayjs(record.act_date) : null,
        act_amount: record.act_amount ?? "",
        document: [],
      }
    : {
        act_date: undefined,
        document: [],
      };

  return (
    <FormModal
      title={editing ? "Редактировать Акт" : "Создать Акт"}
      submitting={submitting}
      onOk={submit}
      onCancel={onClose}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        initialValues={initial}
      >
        <Section
          icon={<FileTextOutlined style={{ color: RED }} />}
          title="Основная информация"
        />
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Номер Акта"
              name="act_number"
              rules={[{ required: true, message: "Введите номер Акта" }]}
            >
              <Input
                placeholder="Введите номер Акта"
                style={{ borderRadius: 10 }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Дата Акта"
              name="act_date"
              rules={[{ required: true, message: "Выберите дату" }]}
            >
              <DateInput />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Сумма Акта"
              name="act_amount"
              rules={[{ required: true, message: "Введите сумму" }]}
            >
              <AmountInput />
            </Form.Item>
          </Col>
        </Row>

        <Section
          icon={<FileDoneOutlined style={{ color: RED }} />}
          title="Документ"
        />
        <Row gutter={16}>
          <Col span={12}>
            {/* Документ Акта теперь обязателен */}
            <PdfField
              required
              editing={editing}
              currentPath={record?.document_path}
            />
          </Col>
        </Row>
      </Form>
    </FormModal>
  );
};

const PoFormModal = ({ contractId, invoiceId, record, onClose, onSaved }) => {
  const { branchId, companyId } = useContext(Ctx);
  const [form] = Form.useForm();
  const editing = !!record;
  const location = useLocation();
  const { companies: dashboardCompanies } = useBranchDashboardStore();

  const stateCompanyName = location.state?.companyName || "";
  const companyFromList = Array.isArray(dashboardCompanies)
    ? dashboardCompanies.find(
        (c) => String(c.id ?? c.company_id) === String(companyId),
      )
    : null;
  const companyName =
    stateCompanyName ||
    companyFromList?.llc ||
    companyFromList?.name ||
    "Актив Банк";

  const { submitting, submit } = useFormSubmit(
    form,
    async (values) => {
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
        sender_name: values.sender_name?.trim() || "",
        sender_bank: values.sender_bank?.trim() || "",
        sender_country: values.sender_country || "",
        document: null,
      };
      const st = usePaymentOrderStore.getState();
      if (editing) {
        await st.updatePaymentOrder(
          branchId,
          companyId,
          contractId,
          invoiceId,
          record.id,
          payload,
        );
        message.success("Платёжное поручение обновлено");
      } else {
        await st.createPaymentOrder(
          branchId,
          companyId,
          contractId,
          invoiceId,
          payload,
        );
        message.success("Платёжное поручение создано");
      }
    },
    onSaved,
    onClose,
  );

  const initial = editing
    ? {
        ...record,
        operation_date: record.operation_date
          ? dayjs(record.operation_date)
          : null,
        value_date: record.value_date ? dayjs(record.value_date) : null,
        amount: record.amount ?? "",
        sender_name: record.sender_name || companyName,
        sender_bank: record.sender_bank || "Актив Банк",
        sender_country: record.sender_country || "Таджикистан",
      }
    : {
        currency: undefined,
        operation_date: undefined,
        value_date: undefined,
        sender_name: companyName,
        sender_bank: "Актив Банк",
        sender_country: "Таджикистан",
      };

  return (
    <FormModal
      title={
        editing
          ? "Редактировать платёжное поручение"
          : "Создать платёжное поручение"
      }
      submitting={submitting}
      onOk={submit}
      onCancel={onClose}
      width={1000}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        initialValues={initial}
      >
        <Section
          icon={<FileTextOutlined style={{ color: RED }} />}
          title="Основная информация"
        />
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Дата валютирования"
              name="value_date"
              rules={[{ required: true, message: "Выберите дату" }]}
            >
              <DateInput />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Сумма платежа"
              name="amount"
              rules={[{ required: true, message: "Введите сумму" }]}
            >
              <AmountInput />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Валюта платежа"
              name="currency"
              rules={[{ required: true, message: "Выберите валюту" }]}
            >
              <CurrencySelect />
            </Form.Item>
          </Col>
        </Row>

        <Section
          icon={<UserOutlined style={{ color: RED }} />}
          title="Плательщик и получатель"
        />
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Название отправителя (Плательщик)"
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
              label="Название получателя"
              name="receiver_name"
              rules={[{ required: true, message: "Введите получателя" }]}
            >
              <Input
                placeholder="Введите получателя"
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
                placeholder="Введите банк"
                style={{ borderRadius: 10 }}
                prefix={<BankOutlined style={{ color: RED }} />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Страна получателя"
              name="receiver_country"
              rules={[{ required: true, message: "Выберите страну" }]}
            >
              <CountrySelect />
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
    </FormModal>
  );
};

const AddButton = ({ children, onClick }) => (
  <Button
    size="middle"
    danger
    type="primary"
    icon={<PlusOutlined />}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      background: RED,
      border: "none",
      borderRadius: 8,
      fontWeight: 600,
    }}
  >
    {children}
  </Button>
);

const RowActions = ({ onEdit, onDelete, deleteTitle, extra }) => {
  const { perms } = useContext(Ctx);
  return (
    <Space size={0} onClick={(e) => e.stopPropagation()}>
      {extra}
      {perms.edit && (
        <Tooltip title="Изменить">
          <Button
            size="small"
            type="text"
            onClick={onEdit}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              height: "auto",
              padding: "4px 8px",
            }}
          >
            <EditOutlined style={{ color: RED, fontSize: 18 }} />
            <span style={{ fontSize: 12, color: RED, marginTop: 4 }}>
              Изменить
            </span>
          </Button>
        </Tooltip>
      )}
      {perms.del && (
        <Popconfirm
          title={deleteTitle}
          description="Запись будет перемещена в корзину."
          okText="Удалить"
          cancelText="Отмена"
          okButtonProps={{ danger: true }}
          onConfirm={onDelete}
        >
          <Tooltip title="Удалить">
            <Button
              size="large"
              type="text"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "auto",
                padding: "4px 8px",
              }}
            >
              <DeleteOutlined style={{ color: "#e60026", fontSize: 18 }} />
              <span style={{ fontSize: 12, color: "#e60026", marginTop: 4 }}>
                Корзина
              </span>
            </Button>
          </Tooltip>
        </Popconfirm>
      )}
    </Space>
  );
};

const NestedBlock = ({ icon, title, count, extra, children }) => (
  <div
    style={{ background: "#fff8f8", borderRadius: 12, padding: "12px 14px" }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        marginBottom: 10,
        gap: 20,
      }}
    >
      {extra && <div>{extra}</div>}
      <Space size={8}>
        {icon}
        <Text strong style={{ color: RED }}>
          {title}
        </Text>
        <Tag color="red" style={{ borderRadius: 10, margin: 0 }}>
          {count}
        </Tag>
      </Space>
    </div>
    {children}
  </div>
);

const nestedTableProps = {
  className: "red-table",
  rowKey: "id",
  size: "large",
  pagination: false,
  tableLayout: "fixed",
  style: { width: "100%" },
};

const LoadingText = () => (
  <div style={{ padding: 16, textAlign: "center" }}>
    <Text type="secondary">Загрузка…</Text>
  </div>
);

// Красная разделительная линия между разделами внутри инвойса
const SectionHr = () => (
  <hr
    style={{
      width: "100%",
      border: "none",
      borderTop: `2px solid ${RED}`,
      margin: 0,
    }}
  />
);

// ---------- Сумма и остаток доп. соглашений (в колонке «Сумма» контракта) ----------
const AgreementsSum = ({ contractId, currency }) => {
  const { branchId, companyId } = useContext(Ctx);
  const [list, setList] = useState([]);

  useEffect(() => {
    let alive = true;
    loadAgreementsQueued(branchId, companyId, contractId)
      .then((l) => alive && setList(l))
      .catch((err) => console.error("Ошибка загрузки доп. соглашений:", err));
    return () => {
      alive = false;
    };
  }, [branchId, companyId, contractId]);

  if (!list.length) return null;

  // Группируем по валюте: суммы в разных валютах нельзя складывать
  const byCurrency = {};
  list.forEach((a) => {
    const cur = a.currency || currency || "—";
    if (!byCurrency[cur]) byCurrency[cur] = { total: 0, remaining: 0, count: 0 };
    byCurrency[cur].total += Number(a.amount) || 0;
    byCurrency[cur].remaining += Number(a.remaining_amount ?? a.amount) || 0;
    byCurrency[cur].count += 1;
  });

  return (
    <div
      style={{ marginTop: 4, paddingTop: 4, borderTop: "1px dashed #e5e5e5" }}
    >
      {Object.entries(byCurrency).map(([cur, g]) => (
        <div key={cur} style={{ marginBottom: 4 }}>
          <Text strong style={{ color: RED, fontSize: 13 }}>
            {formatMoney(g.total, cur)}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            доп. согл. ({g.count}) · остаток: {formatMoney(g.remaining, cur)}
          </Text>
        </div>
      ))}
    </div>
  );
};

// ---------- Список доп. соглашений контракта (колонка таблицы) ----------
const AgreementNumbers = ({ contractId }) => {
  const { branchId, companyId } = useContext(Ctx);
  const [list, setList] = useState(null);

  useEffect(() => {
    let alive = true;
    loadAgreementsQueued(branchId, companyId, contractId)
      .then((l) => alive && setList(l))
      .catch(() => alive && setList([]));
    return () => {
      alive = false;
    };
  }, [branchId, companyId, contractId]);

  if (list === null) return <Text type="secondary">…</Text>;
  if (!list.length) return <Text type="secondary">—</Text>;

  return (
    <Space orientation="vertical" size={2}>
      {list.map((a, i) => (
        <Tag
          key={a.id ?? i}
          color="red"
          style={{ borderRadius: 8, margin: 0, fontWeight: 600 }}
        >
          № {a.agreement_number || "—"}
          {a.agreement_date ? ` · ${formatDateShort(a.agreement_date)}` : ""}
        </Tag>
      ))}
    </Space>
  );
};

const InvoiceDetails = ({ contractId, invoiceId }) => {
  const { branchId, companyId, perms } = useContext(Ctx);
  const [gtd, setGtd] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingGtd, setLoadingGtd] = useState(true);
  const [loadingPo, setLoadingPo] = useState(true);
  const [gtdModal, setGtdModal] = useState(null);
  const [poModal, setPoModal] = useState(null);

  // Состояния для продления срока ГТД
  const [extendModal, setExtendModal] = useState(null); // { gtd }
  const [historyModal, setHistoryModal] = useState(null); // { gtd }

  // Состояния для Актов
  const { acts, fetchActsByInvoice, deleteAct } = useActStore();
  const [loadingActs, setLoadingActs] = useState(true);
  const [actModal, setActModal] = useState(null);

  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadGtd = useCallback(async () => {
    try {
      await useGtdStore
        .getState()
        .fetchGtdByInvoice(branchId, companyId, contractId, invoiceId);
      const list = toArray(useGtdStore.getState().gtdList).filter((g) =>
        sameId(g.invoice_id, invoiceId),
      );
      if (alive.current) setGtd(list);
    } catch (err) {
      console.error("Ошибка загрузки ГТД:", err);
    } finally {
      if (alive.current) setLoadingGtd(false);
    }
  }, [branchId, companyId, contractId, invoiceId]);

  const loadPo = useCallback(async () => {
    try {
      await usePaymentOrderStore
        .getState()
        .fetchPaymentOrders(branchId, companyId, contractId, invoiceId);
      const list = toArray(
        usePaymentOrderStore.getState().paymentOrders,
      ).filter((p) => sameId(p.invoice_id, invoiceId));
      if (alive.current) setOrders(list);
    } catch (err) {
      console.error("Ошибка загрузки ПП:", err);
    } finally {
      if (alive.current) setLoadingPo(false);
    }
  }, [branchId, companyId, contractId, invoiceId]);

  // Загрузка Актов
  const loadActs = useCallback(async () => {
    try {
      await fetchActsByInvoice(branchId, companyId, contractId, invoiceId);
    } catch (err) {
      console.error("Ошибка загрузки Актов:", err);
    } finally {
      if (alive.current) setLoadingActs(false);
    }
  }, [branchId, companyId, contractId, invoiceId, fetchActsByInvoice]);

  useEffect(() => {
    loadGtd();
    loadPo();
    loadActs();
  }, [loadGtd, loadPo, loadActs]);

  const deleteGtd = async (id) => {
    if (!perms.del) {
      message.warning("У вас нет прав на удаление");
      return;
    }
    try {
      await useGtdStore
        .getState()
        .deleteGtd(branchId, companyId, contractId, id);
      message.success("ГТД удалён в корзину");
      loadGtd();
    } catch {
      message.error("Не удалось удалить ГТД");
    }
  };

  const deletePo = async (id) => {
    if (!perms.del) {
      message.warning("У вас нет прав на удаление");
      return;
    }
    try {
      await usePaymentOrderStore
        .getState()
        .deletePaymentOrder(branchId, companyId, contractId, invoiceId, id);
      message.success("Платёжное поручение удалено в корзину");
      loadPo();
    } catch {
      message.error("Не удалось удалить платёжное поручение");
    }
  };

  const handleDeleteAct = async (id) => {
    if (!perms.del) {
      message.warning("У вас нет прав на удаление");
      return;
    }
    try {
      await deleteAct(branchId, companyId, contractId, id);
      message.success("Акт удалён в корзину");
      loadActs();
    } catch {
      message.error("Не удалось удалить Акт");
    }
  };

  const showActions = perms.edit || perms.del;

  const gtdColumns = [
    // Колонка «Действия» ГТД показывается всегда (есть «Продления» для всех)
    {
      title: "Действия",
      key: "actions",
      width: 300,
      align: "center",
      render: (_, r) => (
        <RowActions
          deleteTitle="Удалить ГТД?"
          onEdit={(e) => {
            e.stopPropagation();
            setGtdModal({ record: r });
          }}
          onDelete={() => deleteGtd(r.id)}
          extra={
            <>
              {/* {perms.create && ( */}
                <Tooltip title="Подать заявку на продление срока ГТД">
                  <Button
                    size="small"
                    type="text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExtendModal({ gtd: r });
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "auto",
                      padding: "4px 8px",
                    }}
                  >
                    <FieldTimeOutlined style={{ color: RED, fontSize: 18 }} />
                    <span style={{ fontSize: 12, color: RED, marginTop: 4 }}>
                      Продлить
                    </span>
                  </Button>
                </Tooltip>
              {/* )} */}
              <Tooltip title="Показать продления ГТД полностью">
                <Button
                  size="small"
                  type="text"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHistoryModal({ gtd: r });
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    height: "auto",
                    padding: "4px 8px",
                  }}
                >
                  <EyeOutlined style={{ color: RED, fontSize: 18 }} />
                  <span style={{ fontSize: 12, color: RED, marginTop: 4 }}>
                    Продления
                  </span>
                </Button>
              </Tooltip>
            </>
          }
        />
      ),
    },
    {
      title: "Номер ГТД",
      dataIndex: "gtd_number",
      width: 150,
      render: (v) => (
        <Text strong style={{ fontSize: 13 }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Дата",
      dataIndex: "gtd_date",
      width: 150,
      render: (v) => dateCell(v),
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
      title: "Документ",
      dataIndex: "document_path",
      width: 150,
      render: (v, r) => (
        <DocumentLink entityType="gtd" entityId={r.id} filePath={v} />
      ),
    },
    gtdApprovalColumn,
  ];

  const poColumns = [
    ...(showActions
      ? [
          {
            title: "Действия",
            key: "actions",
            width: 150,
            align: "center",
            render: (_, r) => (
              <RowActions
                deleteTitle="Удалить платёжное поручение?"
                onEdit={(e) => {
                  e.stopPropagation();
                  setPoModal({ record: r });
                }}
                onDelete={() => deletePo(r.id)}
              />
            ),
          },
        ]
      : []),
    {
      title: "Дата валютирования",
      dataIndex: "value_date",
      width: 150,
      render: (v) => dateCell(v),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      width: 120,
      render: (v, r) => (
        <Text strong style={{ color: "#d946ef", fontSize: 13 }}>
          {formatMoney(v, r.currency)}
        </Text>
      ),
    },
    {
      title: "Отправитель",
      dataIndex: "sender_name",
      width: 130,
      ellipsis: { showTitle: false },
      render: (v) => textCell(v, SendOutlined),
    },
    {
      title: "Получатель",
      dataIndex: "receiver_name",
      width: 120,
      ellipsis: { showTitle: false },
      render: (v) => textCell(v, UserOutlined),
    },
    {
      title: "Банк получателя",
      dataIndex: "receiver_bank",
      width: 130,
      ellipsis: { showTitle: false },
      render: (v) => textCell(v, BankOutlined),
    },
    {
      title: "Страна получателя",
      dataIndex: "receiver_country",
      width: 130,
      render: (v) => textCell(v, GlobalOutlined),
    },
    {
      title: "Назначение платежа",
      dataIndex: "payment_purpose",
      width: 130,
      render: (v) => textCell(v),
    },
    poApprovalColumn,
  ];

  // КОЛОНКИ ДЛЯ АКТОВ
  const actColumns = [
    ...(showActions
      ? [
          {
            title: "Действия",
            key: "actions",
            width: 100,
            align: "left",
            render: (_, r) => (
              <RowActions
                deleteTitle="Удалить Акт?"
                onEdit={(e) => {
                  e.stopPropagation();
                  setActModal({ record: r });
                }}
                onDelete={() => handleDeleteAct(r.id)}
              />
            ),
          },
        ]
      : []),
    {
      title: "Номер Акта",
      dataIndex: "act_number",
      width: 150,
      render: (v) => (
        <Text strong style={{ fontSize: 13 }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Дата",
      dataIndex: "act_date",
      width: 150,
      render: (v) => dateCell(v),
    },
    {
      title: "Сумма",
      dataIndex: "act_amount",
      width: 150,
      render: (v, r) => (
        <Text strong style={{ color: "#d946ef", fontSize: 13 }}>
          {formatMoney(v, r.currency)}
        </Text>
      ),
    },
    {
      title: "Документ",
      dataIndex: "document_path",
      width: 150,
      render: (v, r) => (
        <DocumentLink entityType="act" entityId={r.id} filePath={v} />
      ),
    },
  ];

  return (
    <div
      style={{
        padding: "10px 0",
        display: "flex",
        flexDirection: "column",
        gap: 25,
      }}
    >
      {/* Блок ПП */}
      <NestedBlock
        icon={<CreditCardOutlined style={{ color: RED }} />}
        title="Платёжные поручения"
        count={orders.length}
        extra={
          perms.create && (
            <AddButton onClick={() => setPoModal({ record: null })}>
              Добавить ПП
            </AddButton>
          )
        }
      >
        {loadingPo ? (
          <LoadingText />
        ) : (
          <Table
            {...nestedTableProps}
            columns={poColumns}
            dataSource={orders}
            locale={emptyLocale("Платёжных поручений пока нет")}
          />
        )}
      </NestedBlock>
      {/* Блок ГТД */}
      <NestedBlock
        icon={<GlobalOutlined style={{ color: RED }} />}
        title="ГТД"
        count={gtd.length}
        extra={
          perms.create && (
            <AddButton onClick={() => setGtdModal({ record: null })}>
              Добавить ГТД
            </AddButton>
          )
        }
      >
        {loadingGtd ? (
          <LoadingText />
        ) : (
          <Table
            {...nestedTableProps}
            columns={gtdColumns}
            dataSource={gtd}
            locale={emptyLocale("ГТД пока нет")}
          />
        )}
      </NestedBlock>

      <SectionHr />

      {/* Блок АКТОВ */}
      <NestedBlock
        icon={<FilePdfOutlined style={{ color: RED }} />}
        title="Акты выполненных работ"
        count={acts.length}
        extra={
          perms.create && (
            <AddButton onClick={() => setActModal({ record: null })}>
              Добавить Акт
            </AddButton>
          )
        }
      >
        {loadingActs ? (
          <LoadingText />
        ) : (
          <Table
          size="large"
            {...nestedTableProps}
            columns={actColumns}
            dataSource={acts}
            locale={emptyLocale("Актов пока нет")}
          />
        )}
      </NestedBlock>

      {/* Жирная линия, отделяющая этот инвойс от следующего */}
      <hr
        style={{
          width: "100%",
          border: "none",
          borderTop: `4px solid ${RED}`,
          margin: "5px 0 0",
        }}
      />

      {/* Модалки */}
      {gtdModal && (
        <GtdFormModal
          contractId={contractId}
          invoiceId={invoiceId}
          record={gtdModal.record}
          onClose={() => setGtdModal(null)}
          onSaved={loadGtd}
        />
      )}

      {actModal && (
        <ActFormModal
          contractId={contractId}
          invoiceId={invoiceId}
          record={actModal.record}
          onClose={() => setActModal(null)}
          onSaved={loadActs}
        />
      )}

      {poModal && (
        <PoFormModal
          contractId={contractId}
          invoiceId={invoiceId}
          record={poModal.record}
          onClose={() => setPoModal(null)}
          onSaved={loadPo}
        />
      )}

      {/* Продление срока ГТД: подача заявки */}
      {extendModal && (
        <GtdExtendModal
          branchId={branchId}
          companyId={companyId}
          contractId={contractId}
          invoiceId={invoiceId}
          gtd={extendModal.gtd}
          onClose={() => setExtendModal(null)}
          onSaved={loadGtd}
        />
      )}

      {/* Продление срока ГТД: история заявок */}
      {historyModal && (
        <GtdExtensionHistoryModal
          branchId={branchId}
          companyId={companyId}
          contractId={contractId}
          invoiceId={invoiceId}
          gtd={historyModal.gtd}
          canEditRequest={perms.create}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </div>
  );
};

// ---------- Инвойсы одного контракта ----------
const ContractInvoices = ({ contractId }) => {
  const { branchId, companyId, perms } = useContext(Ctx);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { record }
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      await useInvoiceStore
        .getState()
        .fetchInvoices(branchId, companyId, contractId);
      const list = toArray(useInvoiceStore.getState().invoices).filter(
        (inv) =>
          !inv.agreement_id &&
          !inv.agreementId &&
          !inv.additional_agreement_id &&
          !inv.additional_agreement &&
          sameId(inv.contract_id, contractId),
      );
      if (alive.current) setRows(list);
    } catch (err) {
      console.error("Ошибка загрузки инвойсов:", err);
      if (alive.current) message.error("Не удалось загрузить инвойсы");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [branchId, companyId, contractId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!perms.del) {
      message.warning("У вас нет прав на удаление");
      return;
    }
    try {
      await useInvoiceStore
        .getState()
        .deleteInvoice(branchId, companyId, contractId, id);
      message.success("Инвойс удалён в корзину");
      load();
    } catch {
      message.error("Не удалось удалить инвойс");
    }
  };

  const columns = [
    // Колонка «Действия» только если есть право на изменение или удаление
    ...(perms.edit || perms.del
      ? [
          {
            title: "Действия",
            key: "actions",
            width: 160,
            align: "left",
            render: (_, record) => (
              <RowActions
                deleteTitle="Удалить инвойс?"
                onEdit={(e) => {
                  e.stopPropagation();
                  setModal({ record });
                }}
                onDelete={() => handleDelete(record.id)}
              />
            ),
          },
        ]
      : []),
    {
      title: "Номер инвойса",
      dataIndex: "invoice_number",
      key: "invoice_number",
      width: 180,
      render: (v) => (
        <Text strong style={{ fontSize: 13 }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Дата инвойса",
      dataIndex: "invoice_date",
      key: "invoice_date",
      width: 150,
      render: (v) => dateCell(v, "#8b5cf6"),
    },
    {
      title: "Сумма инвойса",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (v, r) => (
        <Space orientation="vertical" size={0}>
          <Text strong style={{ color: "#d946ef", fontSize: 13 }}>
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
      title: "Документ",
      dataIndex: "document_path",
      key: "document_path",
      width: 200,
      render: (v, r) => (
        <DocumentLink entityType="invoice" entityId={r.id} filePath={v} />
      ),
    },
  ];

  return (
    <div style={{ padding: "10px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
          marginBottom: 10,
          gap: 20,
        }}
      >
        <div>
          {perms.create && (
            <AddButton onClick={() => setModal({ record: null })}>
              Добавить инвойс
            </AddButton>
          )}
        </div>
        <Space size={8}>
          <FileTextOutlined style={{ color: RED }} />
          <Text strong style={{ color: RED }}>
            Инвойсы контракта
          </Text>
          <Tag color="red" style={{ borderRadius: 10, margin: 0 }}>
            {rows.length}
          </Tag>
        </Space>
      </div>

      {loading ? (
        <LoadingText />
      ) : (
        <Table
          {...nestedTableProps}
          rowClassName={() => "invoice-row"}
          columns={columns}
          dataSource={rows}
          tableLayout="fixed"
          locale={emptyLocale("Инвойсов пока нет")}
          expandable={{
            expandRowByClick: true,
            expandIcon,
            columnWidth: 40,
            expandedRowRender: (invoice) => (
              <div style={{ position: "relative", width: "100%" }}>
                <InvoiceDetails
                  contractId={contractId}
                  invoiceId={invoice.id}
                />
              </div>
            ),
          }}
        />
      )}

      {modal && (
        <InvoiceFormModal
          contractId={contractId}
          record={modal.record}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export const ContractsUpdate = () => {
  const { id: branchId, companyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { companies: dashboardCompanies, fetchDashboard } =
    useBranchDashboardStore();

  const {
    contracts,
    isLoading,
    error,
    fetchContracts,
    createContract,
    updateContract,
    deleteContract,
    clearError,
  } = useContractStore();
  const { user } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [editingContract, setEditingContract] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [searchAmount, setSearchAmount] = useState("");

  const [currencies, setCurrencies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const searchTimeoutRef = useRef(null);

  const stateCompanyName = location.state?.companyName || "";
  const companyFromList = Array.isArray(dashboardCompanies)
    ? dashboardCompanies.find(
        (c) => String(c.id ?? c.company_id) === String(companyId),
      )
    : null;
  const companyName =
    stateCompanyName || companyFromList?.llc || companyFromList?.name || "";

  // Сбрасываем кэш доп. соглашений при открытии страницы / смене компании
  useEffect(() => {
    agreementsCache.clear();
  }, [branchId, companyId]);

  useEffect(() => {
    if (!stateCompanyName && !companyFromList && branchId) {
      fetchDashboard(branchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, companyId]);

  useEffect(() => {
    if (isModalOpen && !editingContract && companyName) {
      form.setFieldsValue({ sender_name: companyName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName, isModalOpen]);

  // ===== ПРАВА (Да -> можно, Нет -> нельзя) =====
  // admin / compliance — всё; currency_control — по выданным правам
  // (вкладка «Права доступа»); operator — только создание.
  const subPerms = useDocPermissions();
  const canCreate = subPerms.create;
  const canEdit = subPerms.edit;
  const canDelete = subPerms.del;

  const filteredContracts = Array.isArray(contracts)
    ? contracts.filter((contract) => {
        const q = searchText.toLowerCase();
        const matchesText =
          !searchText ||
          String(contract.contract_number || "")
            .toLowerCase()
            .includes(q) ||
          String(contract.subject || "")
            .toLowerCase()
            .includes(q) ||
          String(contract.receiver_name || "")
            .toLowerCase()
            .includes(q);
        const matchesAmount =
          !searchAmount ||
          String(contract.total_amount || "").includes(searchAmount);
        return matchesText && matchesAmount;
      })
    : [];

  const safeContracts = filteredContracts;

  const countryOptions = countries
    .map((c) => {
      if (typeof c === "string") {
        const val = c.trim();
        return val ? { value: val, label: val } : null;
      }
      const name =
        c?.name_ru ||
        c?.name ||
        c?.title ||
        c?.country_name ||
        c?.name_en ||
        "";
      const val = String(name || c?.id || "").trim();
      return val ? { value: val, label: val } : null;
    })
    .filter(Boolean);

  const currencyOptions = currencies.map((c, index) => {
    if (typeof c === "string") return { value: c, label: c };
    const code = c?.code || c?.iso_code || c?.currency_code || c?.id || "";
    const name = c?.name_ru || c?.name || c?.title || "";
    return {
      value: String(code || index),
      label: `${code}${name ? ` - ${name}` : ""}`.trim(),
    };
  });

  useEffect(() => {
    if (branchId && companyId) {
      fetchContracts(branchId, companyId);
    }
  }, [branchId, companyId, fetchContracts]);

  // Ошибка из store: показываем только текст, без {"error": ...}.
  // Одинаковый key объединяет дубликаты в одно сообщение.
  useEffect(() => {
    if (error) {
      message.error({
        content: cleanErrorText(error) || "Произошла ошибка",
        key: "contract-save-error",
      });
      clearError?.();
    }
  }, [error, clearError]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingCurrencies(true);
      try {
        const currenciesData = await searchCurrencies("");
        setCurrencies(toArray(currenciesData));
      } catch (err) {
        message.error("Не удалось загрузить список валют");
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

  useEffect(
    () => () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    },
    [],
  );

  const handleCountrySearch = (value) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingCountries(true);
      try {
        const data = await searchCountries(value);
        setCountries(toArray(data));
      } catch (err) {
        console.error("Ошибка поиска стран:", err);
      } finally {
        setLoadingCountries(false);
      }
    }, 500);
  };

  const handleResetSearch = () => {
    setSearchText("");
    setSearchAmount("");
  };

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
    if (!canCreate) {
      message.warning("У вас нет прав на создание");
      return;
    }
    setEditingContract(null);
    form.resetFields();
    form.setFieldsValue({
      ...INITIAL_FORM_VALUES,
      sender_name: companyName || INITIAL_FORM_VALUES.sender_name,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    if (!canEdit) {
      message.warning("У вас нет прав на редактирование");
      return;
    }
    setEditingContract(record);

    form.setFieldsValue({
      ...record,
      contract_date: record.contract_date ? dayjs(record.contract_date) : null,
      delivery_date: record.delivery_date ? dayjs(record.delivery_date) : null,
      contract_end_date: record.contract_end_date
        ? dayjs(record.contract_end_date)
        : null,
      return_days:
        record.return_days !== undefined && record.return_days !== null
          ? String(record.return_days)
          : "",
      total_amount:
        record.total_amount !== undefined && record.total_amount !== null
          ? String(record.total_amount)
          : "",
      document: [],
      sender_name: record.sender_name || companyName || "Актив Банк",
      sender_bank: record.sender_bank || "Актив Банк",
      sender_country: record.sender_country || "Таджикистан",
      receiver_country: record.receiver_country || undefined,
    });

    setIsModalOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (submitting) return;

    // Повторная проверка прав перед отправкой
    if (editingContract ? !canEdit : !canCreate) {
      message.warning(
        editingContract
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
      const payload = {
        contract_number: values.contract_number?.trim() || "",
        subject: values.subject?.trim() || "",
        contract_date: values.contract_date?.format("YYYY-MM-DD") || null,
        delivery_date: values.delivery_date?.format("YYYY-MM-DD") || null,
        contract_end_date:
          values.contract_end_date?.format("YYYY-MM-DD") || null,
        return_days: values.return_days ? Number(values.return_days) : null,
        total_amount: values.total_amount
          ? Number(String(values.total_amount).replace(/\s|,/g, ""))
          : 0,
        remaining_amount: Number(values.remaining_amount) || 0,
        contract_currency: values.contract_currency || "USD",
        receiver_name:
          values.receiver_name?.trim() || values.receiver_bank?.trim() || "",
        receiver_bank: values.receiver_bank?.trim() || "",
        receiver_country: values.receiver_country || "",
        sender_name: values.sender_name?.trim() || "",
        sender_bank: values.sender_bank?.trim() || "",
        sender_country: values.sender_country || "",
        status: values.status || "draft",
        approval_status: values.approval_status || "pending",
        created_by: values.created_by?.trim() || "",
        document: values.document?.[0]?.originFileObj || null,
      };

      if (editingContract) {
        await updateContract(branchId, companyId, editingContract.id, payload);
        message.success("Контракт успешно обновлен");
      } else {
        await createContract(branchId, companyId, payload);
        message.success("Контракт успешно создан");
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingContract(null);
    } catch (err) {
      console.error("Ошибка сохранения:", err);

      // Только текст сообщения, без {"error": ...}
      message.error({
        content: errMsg(
          err,
          editingContract
            ? "Не удалось обновить контракт"
            : "Не удалось создать контракт",
        ),
        key: "contract-save-error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, contractId) => {
    e?.stopPropagation?.();
    if (!canDelete) {
      message.warning("У вас нет прав на удаление");
      return;
    }
    try {
      await deleteContract(branchId, companyId, contractId);
      message.success("Контракт удален в корзину");
    } catch (err) {
      message.error("Не удалось удалить контракт");
    }
  };

  const handleOpenAdditionalAgreements = (record) => {
    navigate(
      `/branches/${branchId}/companies/${companyId}/contracts/${record.id}/additional-agreements`,
    );
  };

  const reviewColumn = (title, prefix, iconColor) => ({
    title,
    key: prefix,
    width: 240,
    render: (_, record) => {
      const decision = record[`${prefix}_decision`];
      const comment = record[`${prefix}_comment`];
      const reviewer = record[`${prefix}_reviewer`];
      const reviewedBy = record[`${prefix}_reviewed_by`];
      const reviewedAt = record[`${prefix}_reviewed_at`];

      if (!decision && !reviewedBy) {
        return <Text type="secondary">—</Text>;
      }

      const info = DECISION_MAP[decision] || {
        label: decision || "—",
        color: "default",
      };
      const fullName = reviewer
        ? [reviewer.first_name, reviewer.last_name].filter(Boolean).join(" ")
        : "";
      const login = reviewer?.login || reviewedBy || "—";

      return (
        <Space orientation="vertical" size={2}>
          <Tag color={info.color} style={{ borderRadius: 6, margin: 0 }}>
            {info.label}
          </Tag>
          {comment && (
            <Text
              type="secondary"
              style={{ fontSize: 11, fontStyle: "italic" }}
              ellipsis={{ tooltip: comment }}
            >
              «{comment}»
            </Text>
          )}
          <Text style={{ fontSize: 11 }}>
            <UserOutlined
              style={{ color: iconColor, fontSize: 10, marginRight: 4 }}
            />
            {fullName || login}
          </Text>
          <Text type="secondary" style={{ fontSize: 10 }}>
            {formatDateTime(reviewedAt)}
          </Text>
        </Space>
      );
    },
  });

  const columns = [
    {
      title: "Действие",
      key: "actions",
      width: 200,
      align: "center",
      render: (_, record) => (
        <Space size={12}>
          <Tooltip title="Дополнительные соглашения">
            <Button
              size="large"
              type="text"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAdditionalAgreements(record);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "auto",
                padding: "4px 8px",
              }}
            >
              <FileAddOutlined style={{ color: RED, fontSize: 18 }} />
              <span style={{ fontSize: 12, color: RED, marginTop: 4 }}>
                Доп. сог.
              </span>
            </Button>
          </Tooltip>

          {canEdit && (
            <Tooltip title="Редактировать">
              <Button
                size="large"
                type="text"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(record);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "auto",
                  padding: "4px 8px",
                }}
              >
                <EditOutlined style={{ color: RED, fontSize: 18 }} />
                <span style={{ fontSize: 12, color: RED, marginTop: 4 }}>
                  Изменить
                </span>
              </Button>
            </Tooltip>
          )}

          {canDelete && (
            <Popconfirm
              title="Удалить контракт?"
              description="Контракт будет перемещен в корзину."
              okText="Удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
              onConfirm={(e) => handleDelete(e, record.id)}
              onCancel={(e) => e?.stopPropagation?.()}
            >
              <Tooltip title="Удалить">
                <Button
                  size="large"
                  type="text"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    height: "auto",
                    padding: "4px 8px",
                  }}
                >
                  <DeleteOutlined style={{ color: "#e60026", fontSize: 18 }} />
                  <span
                    style={{ fontSize: 12, color: "#e60026", marginTop: 4 }}
                  >
                    Корзина
                  </span>
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
    {
      title: "Номер контракта",
      dataIndex: "contract_number",
      key: "contract_number",
      width: 200,
      render: (v) => <Text strong>{v || "—"}</Text>,
    },
    {
      title: "Предмет контракта",
      dataIndex: "subject",
      key: "subject",
      width: 220,
      ellipsis: { showTitle: false },
      render: (v) => <Text style={{ fontSize: 13 }}>{v || "—"}</Text>,
    },
    {
      title: "Сумма",
      dataIndex: "total_amount",
      key: "total_amount",
      width: 220,
      render: (v, r) => (
        <Space orientation="vertical" size={0}>
          <Text strong style={{ color: "#d946ef", fontSize: 14 }}>
            {formatMoney(v, r.contract_currency)}
          </Text>
          {r.remaining_amount !== undefined && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              остаток: {formatMoney(r.remaining_amount, r.contract_currency)}
            </Text>
          )}
          {/* Сумма и остаток доп. соглашений */}
          <AgreementsSum contractId={r.id} currency={r.contract_currency} />
        </Space>
      ),
    },
    {
      title: "Дата контракта",
      dataIndex: "contract_date",
      key: "contract_date",
      width: 130,
      render: (v) => dateCell(v),
    },
    {
      title: "Дата поставки",
      dataIndex: "delivery_date",
      key: "delivery_date",
      width: 130,
      render: (v) => dateCell(v),
    },
    {
      title: "Дата окончания контракта",
      dataIndex: "contract_end_date",
      key: "contract_end_date",
      width: 150,
      render: (v) => dateCell(v),
    },
    {
      title: "Срок возврата (дней)",
      dataIndex: "return_days",
      key: "return_days",
      width: 150,
      align: "center",
      render: (v) => (
        <Tag color="red" style={{ borderRadius: 8 }}>
          {v !== undefined && v !== null ? v : "—"}
        </Tag>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v) => statusTag(STATUS_MAP, v),
    },
    {
      title: "Получатель",
      dataIndex: "receiver_name",
      key: "receiver_name",
      width: 180,
      ellipsis: { showTitle: false },
      render: (v) => textCell(v, UserOutlined),
    },
    {
      title: "Банк получателя",
      dataIndex: "receiver_bank",
      key: "receiver_bank",
      width: 180,
      ellipsis: { showTitle: false },
      render: (v) => textCell(v, BankOutlined),
    },
    {
      title: "Страна получателя",
      dataIndex: "receiver_country",
      key: "receiver_country",
      width: 180,
      render: (v) => textCell(v, GlobalOutlined),
    },
    {
      title: "Название отправителя",
      dataIndex: "sender_name",
      key: "sender_name",
      width: 180,
      ellipsis: { showTitle: false },
      render: (v) => textCell(v),
    },
    {
      title: "Документ",
      dataIndex: "document_path",
      key: "document_path",
      width: 320,
      render: (v, record) => (
        <DocumentLink entityType="contract" entityId={record.id} filePath={v} />
      ),
    },
    {
      title: "Создал (Операционист)",
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
            <Avatar size={20} style={{ background: RED, fontSize: 10 }}>
              {String(v || "?")
                .charAt(0)
                .toUpperCase()}
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

  const ctxValue = {
    branchId,
    companyId,
    navigate,
    currencyOptions,
    countryOptions,
    loadingCurrencies,
    loadingCountries,
    perms: subPerms,
  };

  return (
    <ConfigProvider
      theme={{ token: { motion: false } }}
      wave={{ disabled: true }}
    >
      <style>{NO_ANIMATION_CSS}</style>
      <Ctx.Provider value={ctxValue}>
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
                <FileTextOutlined style={{ fontSize: 16, color: "#fff" }} />
              </div>
              <div>
                <Title
                  level={3}
                  style={{ margin: 0, fontWeight: 700, color: RED }}
                >
                  Контракты компании
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
                    boxShadow: "0 6px 16px rgba(217,70,239,0.35)",
                    fontWeight: 600,
                  }}
                >
                  Создать контракт
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
            styles={{ body: { padding: 0 } }}
          >
            <div
              style={{
                padding: "16px 20px",
                background: "#fff",
                borderBottom: "1px solid rgba(139,0,0,0.06)",
              }}
            >
              <Row gutter={10} align="end">
                <Col xs={24} sm={12} md={6}>
                  <Input
                    placeholder="Поиск по сумме"
                    prefix={<DollarOutlined style={{ color: RED }} />}
                    value={searchAmount}
                    onChange={(e) => setSearchAmount(e.target.value)}
                    allowClear
                    style={{ borderRadius: 10 }}
                  />
                </Col>
                <Col xs={24} sm={24} md={2}>
                  <Button
                    onClick={handleResetSearch}
                    style={{
                      borderRadius: 10,
                      width: "100%",
                      background: RED,
                      color: "#fff",
                      border: `1px solid ${RED}`,
                    }}
                  >
                    Сбросить
                  </Button>
                </Col>
              </Row>
            </div>

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
                  Список контрактов
                </Text>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  (нажмите на строку, чтобы раскрыть инвойсы, ГТД и платёжные
                  поручения)
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
                Всего: {safeContracts.length}
              </Tag>
            </div>

            <div style={{ padding: 20 }}>
              {isLoading && safeContracts.length === 0 ? (
                <div
                  style={{
                    minHeight: 300,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text type="secondary">Загрузка…</Text>
                </div>
              ) : (
                <Table
                  className="red-table"
                  rowKey="id"
                  rowClassName={() => "contract-row"}
                  columns={columns}
                  dataSource={safeContracts}
                  scroll={{ x: "max-content" }}
                  expandable={{
                    expandRowByClick: true,
                    expandIcon,
                    columnWidth: 40,
                    expandedRowRender: (record) => (
                      <div
                        style={{
                          position: "sticky",
                          left: 0,
                          width: "min(1400px, calc(100vw - 140px))",
                        }}
                      >
                        {/* Контракт в отдельной рамке с шапкой */}
                        <div
                          style={{
                            border: `2px solid ${RED}`,
                            borderRadius: 14,
                            overflow: "hidden",
                            background: "#fff",
                          }}
                        >
                          <div
                            style={{
                              background: RED,
                              color: "#fff",
                              padding: "10px 16px",
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: 16,
                            }}
                          >
                            <Text strong style={{ color: "#fff", fontSize: 15 }}>
                              КОНТРАКТ № {record.contract_number || "—"}
                            </Text>
                            <Text style={{ color: "#fff" }}>
                              Сумма:{" "}
                              <b>
                                {formatMoney(
                                  record.total_amount,
                                  record.contract_currency,
                                )}
                              </b>
                            </Text>
                          </div>
                          <div style={{ padding: "4px 14px 10px" }}>
                            <ContractInvoices contractId={record.id} />
                          </div>
                        </div>
                      </div>
                    ),
                  }}
                  onRow={() => ({ style: { cursor: "pointer" } })}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                    style: { marginTop: 16 },
                  }}
                  locale={emptyLocale("Контрактов пока нет")}
                />
              )}
            </div>
          </Card>

          <Modal
            title={
              <Space>
                <span style={{ fontWeight: 700, color: RED, fontSize: 17 }}>
                  {editingContract
                    ? "Редактировать контракт"
                    : "Создать новый контракт"}
                </span>
              </Space>
            }
            open={isModalOpen}
            onCancel={() => {
              if (!submitting) {
                setIsModalOpen(false);
                setEditingContract(null);
              }
            }}
            afterClose={() => {
              form.resetFields();
              setEditingContract(null);
            }}
            maskClosable={false}
            keyboard={false}
            destroyOnClose
            forceRender
            width={1000}
            style={{ top: 30 }}
            styles={{
              body: { maxHeight: "calc(160vh - 220px)" },
            }}
            footer={[
              <Button
                key="submit"
                danger
                type="primary"
                icon={<CheckOutlined />}
                loading={submitting}
                onClick={handleCreateSubmit}
                style={{
                  borderRadius: 10,
                  height: 35,
                  background: RED,
                  border: "none",
                  boxShadow: "0 6px 16px rgba(217,70,239,0.35)",
                  fontWeight: 600,
                }}
              >
                {editingContract ? "Сохранить изменения" : "Сохранить"}
              </Button>,
              <Button
                key="cancel"
                danger
                icon={<CloseOutlined />}
                disabled={submitting}
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingContract(null);
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
                  <FileTextOutlined style={{ color: RED }} />
                  <Text strong style={{ color: RED }}>
                    Основная информация
                  </Text>
                </Space>
              </Divider>

              <Row gutter={16}>
                <Col span={10}>
                  <Form.Item
                    label="Номер контракта"
                    name="contract_number"
                    rules={[
                      { required: true, message: "Введите номер контракта" },
                    ]}
                  >
                    <Input
                      placeholder="Введите номер контракта"
                      style={{ borderRadius: 10 }}
                    />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item
                    label="Предмет контракта"
                    name="subject"
                    rules={[
                      { required: true, message: "Введите предмет контракта" },
                    ]}
                  >
                    <Input
                      placeholder="Введите предмет контракта"
                      style={{ borderRadius: 10 }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="Дата контракта"
                    name="contract_date"
                    rules={[
                      { required: true, message: "Выберите дату контракта" },
                    ]}
                  >
                    <DatePicker
                      placeholder="Выберите дату контракта"
                      style={{ width: "100%", borderRadius: 10 }}
                      format="YYYY-MM-DD"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Дата поставки"
                    name="delivery_date"
                    rules={[
                      { required: true, message: "Выберите дату поставки" },
                    ]}
                  >
                    <DatePicker
                      placeholder="Выберите дату поставки"
                      style={{ width: "100%", borderRadius: 10 }}
                      format="YYYY-MM-DD"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Дата окончания контракта"
                    name="contract_end_date"
                    rules={[
                      { required: true, message: "Выберите дату окончания" },
                    ]}
                  >
                    <DatePicker
                      placeholder="Выберите дату окончания"
                      style={{ width: "100%", borderRadius: 10 }}
                      format="YYYY-MM-DD"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={10}>
                  <Form.Item
                    label="Срок возврата денежных средств в днях"
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
                <Col span={10}>
                  <Form.Item
                    label="Сумма контракта"
                    name="total_amount"
                    rules={[
                      { required: true, message: "Введите сумму контракта" },
                      {
                        pattern: /^\d+([.,]\d+)?$/,
                        message: "Введите число (например, 1000 или 1000.50)",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Введите сумму контракта"
                      style={{ borderRadius: 10 }}
                      prefix={<DollarOutlined style={{ color: RED }} />}
                    />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item
                    label="Валюта контракта"
                    name="contract_currency"
                    rules={[{ required: true, message: "Выберите валюту" }]}
                  >
                    <Select
                      showSearch
                      placeholder="Выберите валюту"
                      style={{ borderRadius: 10, border: "1px solid #8b0000" }}
                      loading={loadingCurrencies}
                      optionFilterProp="label"
                      options={currencyOptions}
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
                    rules={[
                      { required: true, message: "Введите название получателя" },
                    ]}
                  >
                    <Input
                      placeholder="Введите название получателя"
                      style={{ borderRadius: 10 }}
                      prefix={<UserOutlined style={{ color: RED }} />}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Банк получателя"
                    name="receiver_bank"
                    rules={[
                      { required: true, message: "Введите банк получателя" },
                    ]}
                  >
                    <Input
                      placeholder="Введите банк получателя"
                      style={{ borderRadius: 10 }}
                      prefix={<BankOutlined style={{ color: RED }} />}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Страна получателя"
                    name="receiver_country"
                    rules={[
                      { required: true, message: "Выберите страну получателя" },
                    ]}
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
                      onSearch={handleCountrySearch}
                      filterOption={false}
                      options={countryOptions}
                      allowClear
                      notFoundContent={
                        loadingCountries ? "Загрузка…" : "Ничего не найдено"
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
                      editingContract
                        ? "Загрузить новый документ (опционально)"
                        : "Загрузить документ (PDF)"
                    }
                    name="document"
                    valuePropName="fileList"
                    getValueFromEvent={(e) =>
                      Array.isArray(e) ? e : e?.fileList
                    }
                    rules={
                      editingContract
                        ? []
                        : [
                            {
                              required: true,
                              message: "Загрузите PDF документ",
                            },
                          ]
                    }
                    extra={
                      editingContract && editingContract.document_path ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Текущий файл:{" "}
                          <Text code style={{ fontSize: 11 }}>
                            {editingContract.document_path.split(/[\\/]/).pop()}
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
        </div>
      </Ctx.Provider>
    </ConfigProvider>
  );
};

export default ContractsUpdate;