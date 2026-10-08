import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Button,
  Tooltip,
  message,
  Table,
  Spin,
  Empty,
  Form,
  Select,
  Input,
  DatePicker,
} from "antd";

import {
  BarChartOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilterOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import { useReportsStore } from "../store/useReportsStore";
import { useAuthStore } from "../store/useAuth";
import { useBranchDashboardStore } from "../store/useBranchDashboard";
import { searchCurrencies } from "../api/dictionary.service";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const redGradientText = {
  background: "linear-gradient(90deg, #ff4b4b, #e60026, #cf1322)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const redGradientBg = {
  background: "linear-gradient(135deg, #ff4b4b 0%, #e60026 100%)",
};

const formatDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (v, currency) => {
  if (v === null || v === undefined || v === "") return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return String(v);
  return `${num.toLocaleString("ru-RU")} ${currency || ""}`.trim();
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const ReportsPage = () => {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const { branchesAll } = useBranchDashboardStore();

  const branchId = session?.branch_id;

  const {
    reportTypes,
    typesLoading,
    report,
    reportLoading,
    exporting,
    uploading,
    error,
    fetchTypes,
    fetchContracts,
    exportReport,
    downloadTemplate,
    uploadTemplate,
    clearError,
  } = useReportsStore();

  const [filterForm] = Form.useForm();
  const [exportForm] = Form.useForm();

  // ✅ Валюты из API
  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  useEffect(() => {
    fetchTypes().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Загрузка валют
  useEffect(() => {
    const loadCurrencies = async () => {
      setLoadingCurrencies(true);
      try {
        const data = await searchCurrencies("");
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        setCurrencies(list);
      } catch (err) {
        console.error("Ошибка загрузки валют:", err);
      } finally {
        setLoadingCurrencies(false);
      }
    };
    loadCurrencies();
  }, []);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  // === Применить фильтры отчёта ===
  const handleApplyFilters = async () => {
    let values;
    try {
      values = await filterForm.validateFields();
    } catch {
      return;
    }

    const filters = {
      branch_id: branchId,
      from_date: values.period?.[0]?.format("YYYY-MM-DD") || null,
      to_date: values.period?.[1]?.format("YYYY-MM-DD") || null,
      currency: values.currency || null,
    };

    try {
      await fetchContracts(filters);
      message.success("Отчёт сформирован");
    } catch (e) {
      // ошибка уже в сторе
    }
  };

  // === Экспорт в Excel ===
  const handleExport = async () => {
    let values;
    try {
      values = await exportForm.validateFields();
    } catch {
      return;
    }

    const filters = {
      type: values.type,
      inn: values.inn || null,
      branch_id: values.branch_id || branchId,
      from_date: values.period?.[0]?.format("YYYY-MM-DD") || null,
      to_date: values.period?.[1]?.format("YYYY-MM-DD") || null,
      currency: values.currency || null,
    };

    try {
      const response = await exportReport(filters);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      downloadBlob(blob, `report_${filters.type}_${Date.now()}.xlsx`);
      message.success("Отчёт выгружен");
    } catch (e) {
      message.error("Не удалось выгрузить отчёт");
    }
  };

  const handleDownloadTemplate = async (reportType) => {
    try {
      const response = await downloadTemplate(reportType);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      downloadBlob(blob, `template_${reportType}.xlsx`);
      message.success("Шаблон скачан");
    } catch (e) {
      message.error("Не удалось скачать шаблон");
    }
  };

  const handleUploadTemplate = async (reportType, file) => {
    try {
      await uploadTemplate(reportType, file);
      message.success("Шаблон загружен");
    } catch (e) {
      message.error("Не удалось загрузить шаблон");
    }
  };

  const columns = [
    {
      title: "№ контракта",
      dataIndex: "contract_number",
      key: "contract_number",
      width: 180,
      render: (v) => (
        <Text strong style={{ fontFamily: "monospace", fontSize: 13 }}>
          {v || "—"}
        </Text>
      ),
    },
    {
      title: "Предмет",
      dataIndex: "subject",
      key: "subject",
      width: 240,
      ellipsis: { showTitle: false },
      render: (v) => (
        <Tooltip title={v}>
          <Text style={{ fontSize: 13 }}>{v || "—"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Филиал",
      dataIndex: "branch_name",
      key: "branch_name",
      width: 160,
      render: (v) => <Text style={{ fontSize: 13 }}>{v || "—"}</Text>,
    },
    {
      title: "Дата",
      dataIndex: "contract_date",
      key: "contract_date",
      width: 130,
      render: (v) => <Text style={{ fontSize: 13 }}>{formatDate(v)}</Text>,
    },
    {
      title: "Сумма",
      dataIndex: "total_amount",
      key: "total_amount",
      width: 150,
      render: (v, r) => (
        <Text strong style={{ color: "#e60026", fontSize: 13 }}>
          {formatMoney(v, r.contract_currency)}
        </Text>
      ),
    },
    {
      title: "Инвойсов",
      dataIndex: "invoices_count",
      key: "invoices_count",
      width: 110,
      align: "center",
      render: (v) => <Tag color="blue">{v ?? 0}</Tag>,
    },
    {
      title: "Сумма инвойсов",
      dataIndex: "invoices_amount",
      key: "invoices_amount",
      width: 160,
      render: (v, r) => (
        <Text style={{ fontSize: 13 }}>
          {formatMoney(v, r.contract_currency)}
        </Text>
      ),
    },
    {
      title: "Остаток",
      dataIndex: "remaining_amount",
      key: "remaining_amount",
      width: 150,
      render: (v, r) => (
        <Text style={{ fontSize: 13 }}>
          {formatMoney(v, r.contract_currency)}
        </Text>
      ),
    },
    {
      title: "Просрочен",
      dataIndex: "is_overdue",
      key: "is_overdue",
      width: 120,
      align: "center",
      render: (v) =>
        v ? <Tag color="red">Да</Tag> : <Tag color="green">Нет</Tag>,
    },
  ];

  const safeTypes = Array.isArray(reportTypes) ? reportTypes : [];
  const safeContracts = Array.isArray(report?.contracts)
    ? report.contracts
    : [];

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
              // ...redGradientBg,
              background: '#8b0000',
              boxShadow: "0 10px 24px rgba(230,0,38,0.28)",
              flexShrink: 0,
            }}
          >
            <BarChartOutlined style={{ fontSize: 18, color: "#fff" }} />
          </div>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, color: '#8b0000' }}
            >
              Формирование отчётов
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Аналитика по контрактам, инвойсам, ГТД и клиентам
            </Text>
          </div>
        </Space>

        <Button
          danger
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ borderRadius: 12, height: 35 }}
        >
          Назад
        </Button>
      </div>
      <Card
        style={{
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        }}
        bodyStyle={{ padding: 20 }}
      >
        <Space size={10} style={{ marginBottom: 16 }}>
          <FileExcelOutlined style={{ color: "#8b0000", fontSize: 18 }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#8b0000' }}>
            Выгрузка отчёта в Excel
          </Title>
        </Space>

        <Form form={exportForm} layout="vertical" autoComplete="off">
          <Row gutter={[16, 16]} align="bottom">
            <Col xs={24} md={8}>
              <Form.Item
                label="Тип отчёта"
                name="type"
                rules={[{ required: true, message: "Выберите тип" }]}
              >
                <Select
                  placeholder="Выберите тип"
                  style={{ borderRadius: 10, border: '1px solid #8b0000' }}
                  options={[
                    { value: "contracts", label: "Контракты" },
                    { value: "invoices", label: "Инвойсы" },
                    { value: "gtd", label: "ГТД" },
                    {
                      value: "additional_agreements",
                      label: "Доп. соглашения",
                    },
                    { value: "clients", label: "Клиенты" },
                    {
                      value: "client_consolidated",
                      label: "Сводный по клиенту",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="ИНН клиента" name="inn">
                <Input
                  placeholder="Введите ИНН (опционально)"
                  maxLength={9}
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Период" name="period">
                <RangePicker
                  style={{ width: "100%", borderRadius: 10 }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>

          <Space size={12} wrap>
            <Button
              type="primary"
              danger
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={handleExport}
              style={{
                borderRadius: 10,
                height: 35,
                background: "#8b0000",
                border: "none",
                fontWeight: 600,
                padding: "0 24px",
              }}
            >
              Выгрузить в Excel
            </Button>
          </Space>
        </Form>
      </Card>

      <Card
        style={{
          margin: "20px 10px",
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        }}
        bodyStyle={{ padding: 20 }}
      >
        <Space size={10} style={{ marginBottom: 16 }}>
          <FilterOutlined style={{ color: "#e60026", fontSize: 16 }} />
          <Text strong style={{ fontSize: 15 }}>
            Фильтры отчёта по контрактам
          </Text>
        </Space>

        <Form form={filterForm} layout="vertical" autoComplete="off">
          <Row gutter={[16, 16]} align="bottom">
            <Col xs={24} md={10}>
              <Form.Item label="Период" name="period">
                <RangePicker
                  style={{ width: "100%", borderRadius: 10 }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
            <Col xs={22} md={8}>
              <Form.Item label="Валюта" name="currency">
                <Select
                  allowClear
                  showSearch
                  placeholder="Все валюты"
                  style={{ borderRadius: 10, border: '1px solid #8b0000' }}
                  loading={loadingCurrencies}
                  optionFilterProp="label"
                  options={currencies.map((c) => ({
                    value: c.code,
                    label: `${c.code} - ${c.name_ru || c.name || ""}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Space
                size={8}
                style={{ width: "100%", display: "flex", marginBottom: 25 }}
              >
                <Button
                  type="primary"
                  danger
                  icon={<BarChartOutlined />}
                  onClick={handleApplyFilters}
                  loading={reportLoading}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    height: 35,
                    background: "#8b0000",
                    border: "none",
                    fontWeight: 600,
                  }}
                >
                  Сформировать
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>
      <Card
        style={{
          marginBottom: 20,
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
              "linear-gradient(90deg, #fff5f5 0%, #ffffff 60%, #fff5f5 100%)",
            borderBottom: "1px solid rgba(139,0,0,0.06)",
          }}
        >
          <Space size={10}>
            <FileExcelOutlined style={{ color: "#e60026", fontSize: 16 }} />
            <Text strong style={{ fontSize: 15 }}>
              Отчёт по контрактам
            </Text>
          </Space>
          <Tag color="red" style={{ borderRadius: 8, color: '#8b0000' }}>
            Всего: {safeContracts.length}
          </Tag>
        </div>

        <div style={{ padding: 20 }}>
          {reportLoading ? (
            <div
              style={{
                minHeight: 300,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Spin size="middle" style={{ color: "#e60026" }} />
            </div>
          ) : (
            <Table
              className="red-table"
              rowKey={(r) => String(r.id ?? r.contract_number ?? Math.random())}
              columns={columns}
              dataSource={safeContracts}
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                // showTotal: (t) => (
                //   <span style={{ color: "#e60026", fontWeight: 600 }}>
                //     Всего: {t}
                //   </span>
                // ),
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: "#999" }}>
                        Нажмите «Сформировать» — отчёт появится здесь
                      </span>
                    }
                  />
                ),
              }}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default ReportsPage;