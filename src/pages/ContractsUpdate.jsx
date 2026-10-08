import { useEffect, useState, useRef } from "react";
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
  NumberOutlined,
  FileAddOutlined,
  SafetyCertificateOutlined,
  SearchOutlined, // ✅ ИЗМЕНЕНИЕ: Добавлена иконка поиска
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import { useContractStore } from "../store/useContractStore";
import { useAuthStore } from "../store/useAuth";
import { searchCountries, searchCurrencies } from "../api/dictionary.service";
import DocumentLink from "../pages/DocumentLink";

const { Title, Text } = Typography;

const gradientText = {
  background: "linear-gradient(90deg, #ff4b4b, #d946ef, #8b5cf6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const CAN_CREATE_EDIT = ["admin", "compliance", "operator"];
const CAN_EDIT = ["admin", "compliance"];
const CAN_DELETE = ["admin", "compliance", "currency_control"];

const STATUS_MAP = {
  draft: { label: "Черновик", color: "default" },
  active: { label: "Активный", color: "green" },
  completed: { label: "Завершён", color: "blue" },
  cancelled: { label: "Отменён", color: "red" },
  archived: { label: "В архиве", color: "purple" },
};
const APPROVAL_STATUS_MAP = {
  pending: { label: "В ожидании", color: "gold" },
  pending_currency_control: {
    label: "На валютном контроле",
    color: "orange",
  },
  pending_compliance: {
    label: "На комплаенсе",
    color: "purple",
  },
  revision: { label: "На доработке", color: "volcano" },
  approved: { label: "Одобрено", color: "green" },
  accepted: { label: "Принято", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
  declined: { label: "Отклонено", color: "red" },
  archived: { label: "В архиве", color: "default" },
};

const DECISION_MAP = {
  approve: { label: "Одобрено", color: "green" },
  reject: { label: "Отклонено", color: "red" },
  accepted: { label: "Принято", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
  revision: { label: "На доработке", color: "orange" },
};

const CURRENCY_COLORS = {
  USD: "#52c41a",
  EUR: "#1890ff",
  RUB: "#fa541c",
  TJS: "#722ed1",
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
  contract_currency: "USD",
  status: "draft",
  approval_status: "pending",
  remaining_amount: 0,
  total_amount: "",
  return_days: "",
};

export const ContractsUpdate = () => {
  const { id: branchId, companyId } = useParams();
  const navigate = useNavigate();

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
  const { role, user } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [editingContract, setEditingContract] = useState(null);

  // ✅ ИЗМЕНЕНИЕ: Состояние для поиска
  const [searchText, setSearchText] = useState(""); // Для поиска по номеру, предмету и т.д.
  const [searchAmount, setSearchAmount] = useState(""); // Для поиска по сумме (amount из API)

  const [currencies, setCurrencies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const searchTimeoutRef = useRef(null);

  const normalizedRole = String(role || "").toLowerCase();
  const canCreateEdit = CAN_CREATE_EDIT.includes(normalizedRole);
  const canEdit = CAN_EDIT.includes(normalizedRole);
  const canDelete = CAN_DELETE.includes(normalizedRole);
  
  // ✅ ИЗМЕНЕНИЕ: Фильтрация данных на клиенте (если API не поддерживает поиск по всем полям)
  // Если API поддерживает параметр amount, мы должны передавать его в fetchContracts, но здесь мы фильтруем локально для мгновенного отклика
  const filteredContracts = Array.isArray(contracts) ? contracts.filter((contract) => {
    const matchesText = 
      !searchText || 
      String(contract.contract_number || "").toLowerCase().includes(searchText.toLowerCase()) ||
      String(contract.subject || "").toLowerCase().includes(searchText.toLowerCase()) ||
      String(contract.receiver_name || "").toLowerCase().includes(searchText.toLowerCase());
    
    // Поиск по сумме (точное совпадение или вхождение)
    const matchesAmount = 
      !searchAmount || 
      String(contract.total_amount || "").includes(searchAmount);

    return matchesText && matchesAmount;
  }) : [];

  const safeContracts = filteredContracts; // Используем отфильтрованные данные

  useEffect(() => {
    if (branchId && companyId) {
      // ✅ ИЗМЕНЕНИЕ: Если API поддерживает передачу amount, можно раскомментировать:
      // fetchContracts(branchId, companyId, { amount: searchAmount });
      fetchContracts(branchId, companyId);
    }
  }, [branchId, companyId, fetchContracts]);

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
      } catch (err) {
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

  const handleCountrySearch = (value) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingCountries(true);
      try {
        const data = await searchCountries(value);
        setCountries(data);
      } catch (err) {
        console.error("Ошибка поиска стран:", err);
      } finally {
        setLoadingCountries(false);
      }
    }, 500);
  };

  // ✅ ИЗМЕНЕНИЕ: Функция сброса поиска
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

    const surname = rawFirstName || "";
    const name = rawLastName || "";

    const fullName = [surname, name].filter(Boolean).join(" ").trim();

    return { fullName, login, email };
  };

  const openCreateModal = () => {
    setEditingContract(null);
    form.resetFields();
    form.setFieldsValue(INITIAL_FORM_VALUES);
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
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
    });

    setIsModalOpen(true);
  };

  const handleCreateSubmit = async () => {
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
        receiver_name: values.receiver_name?.trim() || "",
        receiver_bank: values.receiver_bank?.trim() || "",
        receiver_country: values.receiver_country || "",
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
      const backendMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        JSON.stringify(err?.response?.data) ||
        null;

      message.error(
        backendMsg ||
          (editingContract
            ? "Не удалось обновить контракт"
            : "Не удалось создать контракт")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, contractId) => {
    e?.stopPropagation?.();
    try {
      await deleteContract(branchId, companyId, contractId);
      message.success("Контракт удален в корзину");
    } catch (err) {
      message.error("Не удалось удалить контракт");
    }
  };

  const handleRowClick = (record) => {
    navigate(
      `/branches/${branchId}/companies/${companyId}/contracts/${record.id}/invoices`
    );
  };

  const handleOpenAdditionalAgreements = (record) => {
    navigate(
      `/branches/${branchId}/companies/${companyId}/contracts/${record.id}/additional-agreements`
    );
  };

  const columns = [
    {
      title: "Номер контракта",
      dataIndex: "contract_number",
      key: "contract_number",
      width: 160,
      render: (v) => (
        <Space size={6}>
          <Text strong>{v || "—"}</Text>
        </Space>
      ),
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
      width: 140,
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: "#d946ef", fontSize: 14 }}>
            {formatMoney(v, r.contract_currency)}
          </Text>
          {r.remaining_amount !== undefined && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              остаток: {formatMoney(r.remaining_amount, r.contract_currency)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Валюта",
      dataIndex: "contract_currency",
      key: "contract_currency",
      width: 90,
      align: "center",
      render: (v) => (
        <Tag
          style={{
            borderRadius: 8,
            fontWeight: 700,
            background: CURRENCY_COLORS[v] || "#999",
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
      title: "Дата контракта",
      dataIndex: "contract_date",
      key: "contract_date",
      width: 130,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Дата поставки",
      dataIndex: "delivery_date",
      key: "delivery_date",
      width: 130,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Дата окончания",
      dataIndex: "contract_end_date",
      key: "contract_end_date",
      width: 130,
      render: (v) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{formatDateShort(v)}</Text>
        </Space>
      ),
    },
    {
      title: "Срок возврата (дней)",
      dataIndex: "return_days",
      key: "return_days",
      width: 150,
      align: "center",
      render: (v) => (
        <Tag color="purple" style={{ borderRadius: 8 }}>
          {v !== undefined && v !== null ? v : "—"}
        </Tag>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v) => {
        const info = STATUS_MAP[v] || { label: v || "—", color: "default" };
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
      title: "Комплаенс",
      key: "compliance",
      width: 240,
      render: (_, record) => {
        const decision = record.compliance_decision;
        const comment = record.compliance_comment;
        const reviewer = record.compliance_reviewer;
        const reviewedBy = record.compliance_reviewed_by;
        const reviewedAt = record.compliance_reviewed_at;

        if (!decision && !reviewedBy) {
          return <Text type="secondary">—</Text>;
        }

        const info = DECISION_MAP[decision] || {
          label: decision || "—",
          color: "default",
        };
        const fullName = reviewer
          ? [reviewer.first_name, reviewer.last_name]
              .filter(Boolean)
              .join(" ")
          : "";
        const login = reviewer?.login || reviewedBy || "—";

        return (
          <Space direction="vertical" size={2}>
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
                style={{ color: "#52c41a", fontSize: 10, marginRight: 4 }}
              />
              {fullName || login}
            </Text>
            <Text type="secondary" style={{ fontSize: 10 }}>
              {formatDateTime(reviewedAt)}
            </Text>
          </Space>
        );
      },
    },

    {
      title: "Валютный контроль",
      key: "currency_control",
      width: 240,
      render: (_, record) => {
        const decision = record.currency_control_decision;
        const comment = record.currency_control_comment;
        const reviewer = record.currency_control_reviewer;
        const reviewedBy = record.currency_control_reviewed_by;
        const reviewedAt = record.currency_control_reviewed_at;

        if (!decision && !reviewedBy) {
          return <Text type="secondary">—</Text>;
        }

        const info = DECISION_MAP[decision] || {
          label: decision || "—",
          color: "default",
        };
        const fullName = reviewer
          ? [reviewer.first_name, reviewer.last_name]
              .filter(Boolean)
              .join(" ")
          : "";
        const login = reviewer?.login || reviewedBy || "—";

        return (
          <Space direction="vertical" size={2}>
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
                style={{ color: "#fa8c16", fontSize: 10, marginRight: 4 }}
              />
              {fullName || login}
            </Text>
            <Text type="secondary" style={{ fontSize: 10 }}>
              {formatDateTime(reviewedAt)}
            </Text>
          </Space>
        );
      },
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
            <UserOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Банк получателя",
      dataIndex: "receiver_bank",
      key: "receiver_bank",
      width: 180,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Space size={6}>
            <BankOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Страна получателя",
      dataIndex: "receiver_country",
      key: "receiver_country",
      width: 160,
      render: (v) => (
        <Space size={6}>
          <GlobalOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Документ",
      dataIndex: "document_path",
      key: "document_path",
      width: 320,
      render: (v, record) => (
        <DocumentLink
          entityType="contract"
          entityId={record.id}
          filePath={v}
        />
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
            width: 140,
            align: "right",
            render: (_, record) => (
              <Space size={4}>
                <Tooltip title="Дополнительные соглашения">
                  <Button
                    type="text"
                    icon={<FileAddOutlined style={{ color: "#8b0000" }} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAdditionalAgreements(record);
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
              style={{ margin: 0, fontWeight: 700, color: '#8b0000' }}
            >
              Контракты компании
            </Title>
            <Space size={10} style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 13, }}>
                Филиал:
              </Text>
              <Tag
                color="red"
                style={{
                  borderRadius: 8,
                  padding: "1px 10px",
                  fontWeight: 600,
                  margin: 0,
                  color: '#8b0000',
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
                background: '#8b0000',
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
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            padding: "16px 20px",
            background: "#fff",
            borderBottom: "1px solid rgba(139,0,0,0.06)",
          }}
        >
          <Row gutter={10} align="end">
            {/* <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Поиск по номеру, предмету, получателю..."
                prefix={<SearchOutlined style={{ color: "#8b0000" }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ borderRadius: 10 }}
              />
            </Col> */}
            <Col xs={24} sm={12} md={6}>
              <Input
                placeholder="Поиск по сумме"
                prefix={<DollarOutlined style={{ color: "#8b0000" }} />}
                value={searchAmount}
                onChange={(e) => setSearchAmount(e.target.value)}
                allowClear
                style={{ borderRadius: 10 }}
              />
            </Col>
            <Col xs={24} sm={24} md={2}>
               <Button 
                 onClick={handleResetSearch}
                 style={{ borderRadius: 10, width: '100%', background: '#8b0000', color: '#fff', border: '1px solid #8b0000' }}
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
            <BankOutlined style={{ color: "#8b0000", fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: '#8b0000' }}>
              Список контрактов
            </Text>
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8, }}>
              (нажмите на строку, чтобы открыть инвойсы)
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
              <Spin size="middle" style={{ color: "#f00" }} />
            </div>
          ) : (
            <Table
              className="red-table"
              rowKey={(r) => String(r.id ?? Math.random())}
              loading={isLoading}
              columns={columns}
              dataSource={safeContracts}
              scroll={{ x: "max-content" }}
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
                style: { cursor: "pointer" },
              })}
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
                      <span style={{ color: "#999" }}>Контрактов пока нет</span>
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
          body: { maxHeight: "calc(100vh - 160px)" },
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
              background: "#8b0000",
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
              <FileTextOutlined style={{ color: "#8b0000" }} />
              <Text strong style={{color: '#8b0000'}}>
                Основная информация
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                label="Номер контракта"
                name="contract_number"
                rules={[{ required: true, message: "Введите номер контракта" }]}
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
                rules={[{ required: true, message: "Выберите дату контракта" }]}
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
                rules={[{ required: true, message: "Выберите дату поставки" }]}
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
                label="Дата окончания"
                name="contract_end_date"
                rules={[{ required: true, message: "Выберите дату окончания" }]}
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
              <DollarOutlined style={{ color: "#8b0000" }} />
              <Text strong style={{color: '#8b0000'}}>
                Финансы
              </Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={8}>
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
                  prefix={<DollarOutlined style={{ color: "#8b0000" }} />}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Валюта контракта"
                name="contract_currency"
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
              <Text strong style={{color: '#8b0000'}}>
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
                  placeholder="Введите название получателя"
                  style={{ borderRadius: 10 }}
                  prefix={<UserOutlined style={{ color: "#8b0000" }} />}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Банк получателя"
                name="receiver_bank"
                rules={[{ required: true, message: "Введите банк получателя" }]}
              >
                <Input
                  placeholder="Введите банк получателя"
                  style={{ borderRadius: 10 }}
                  prefix={<BankOutlined style={{ color: "#8b0000" }} />}
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
                  style={{ borderRadius: 10, border: '1px solid #8b0000' }}
                  loading={loadingCountries}
                  onSearch={handleCountrySearch}
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
              <Text strong style={{color: '#8b0000'}}>
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
                    : "Загрузить документ (PDF/Word)"
                }
                name="document"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={
                  editingContract
                    ? []
                    : [{ required: true, message: "Загрузите документ" }]
                }
                extra={
                  editingContract && editingContract.document_path ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Текущий файл:{" "}
                      <Text code style={{ fontSize: 11 }}>
                        {editingContract.document_path
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
                  accept=".pdf,.doc,.docx"
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
                    Поддерживаются файлы PDF, DOC, DOCX
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

export default ContractsUpdate;