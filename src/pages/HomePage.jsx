import { useEffect, useMemo } from "react";
import {
  Card,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Tooltip,
  message,
} from "antd";

import {
  SafetyCertificateOutlined,
  BankOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  DeleteOutlined,
  AuditOutlined,
  FileDoneOutlined,
  ApartmentOutlined,
  FileSearchOutlined,
  BarChartOutlined,
  InboxOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuth";
import { useBranchDashboardStore } from "../store/useBranchDashboard";
import { useReportsStore } from "../store/useReportsStore";

const { Title, Text, Paragraph } = Typography;

const redGradientBg = {
  background: "linear-gradient(135deg, #ff4b4b 0%, #e60026 100%)",
};

const HomePage = () => {
  const navigate = useNavigate();

  const { user, role, session } = useAuthStore();
  const {
    notificationsTotal,
    fetchDashboard,
    fetchNotifications,
  } = useBranchDashboardStore();

  const {
    reportTypesCount,
    typesLoading: typesLoadingReports,
    typesLoaded,
    fetchTypes,
  } = useReportsStore();

  const branchId = session?.branch_id;
  const normalizedRole = String(role || "").toLowerCase();

  const isAdminOrCompliance =
    normalizedRole === "admin" || normalizedRole === "compliance";

  const canViewApprovals =
    normalizedRole === "compliance" ||
    normalizedRole === "currency_control";

  const canViewApprovalsPage =
    normalizedRole === "admin" ||
    normalizedRole === "compliance" ||
    normalizedRole === "currency_control";

  const canViewReports = normalizedRole !== "operator";

  const canViewAuditLogs =
    normalizedRole === "admin" ||
    normalizedRole === "compliance" ||
    normalizedRole === "internal_audit";

  const canViewTrash =
    normalizedRole === "compliance" ||
    normalizedRole === "currency_control" ||
    normalizedRole === "admin";

  const canViewArchive =
    normalizedRole === "admin" ||
    normalizedRole === "compliance" ||
    normalizedRole === "currency_control" ||
    normalizedRole === "branch_head";

  const roleLabel = useMemo(() => {
    const map = {
      admin: "Администратор",
      compliance: "Комплаенс",
      operator: "Операционист",
      currency_control: "Валютный контроль",
      branch_head: "Руководитель филиала",
      internal_audit: "Внутренний аудит",
    };
    return map[normalizedRole] || role || "Пользователь";
  }, [normalizedRole, role]);

  const fullName = [user?.last_name, user?.first_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  useEffect(() => {
    if (branchId) {
      fetchDashboard(branchId).catch(() => {});
      fetchNotifications(branchId).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);


  useEffect(() => {
    if (canViewReports && !typesLoaded) {
      fetchTypes().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewReports, typesLoaded]);

  const quickActions = [
    {
      key: "companies",
      title: "Компании филиала",
      desc: "Список компаний и уведомления по срокам",
      icon: <BankOutlined />,
      onClick: () => {
        if (!branchId) {
          message.warning("У вас не привязан филиал");
          return;
        }
        navigate(`/branches/${branchId}/dashboard`);
      },
      visible: true,
    },
    {
      key: "users",
      title: "Пользователи",
      desc: "Управление ролями и доступами",
      icon: <TeamOutlined />,
      onClick: isAdminOrCompliance
        ? () => navigate("/users-manage")
        : undefined,
      visible: isAdminOrCompliance,
    },
    {
      key: "documents",
      title: "Мои документы",
      desc: "Все ваши файлы в одном месте",
      icon: <FileDoneOutlined />,
      onClick: () => navigate("/my-documents"),
      visible: true,
    },
    {
      key: "access-requests",
      title: "Заявки на доступ",
      desc: "Новые запросы на роли и филиалы",
      icon: <AuditOutlined />,
      onClick: () => navigate("/access-requests"),
      visible: isAdminOrCompliance,
    },
    {
      key: "branches-manage",
      title: "Управление филиалами",
      desc: "Создание и настройка филиалов",
      icon: <ApartmentOutlined />,
      onClick: () => navigate("/branches-manage"),
      visible: isAdminOrCompliance,
    },
    {
      key: "history",
      title: "История запросов",
      desc: "Обработанные заявки на доступ",
      icon: <HistoryOutlined />,
      onClick: () => navigate("/access-requests/history"),
      visible: isAdminOrCompliance,
    },
    {
      key: "audit",
      title: "Журнал аудита",
      desc: "История действий пользователей",
      icon: <FileSearchOutlined />,
      onClick: () => navigate("/audit-logs"),
      visible: canViewAuditLogs,
    },
    {
      key: "archive",
      title: "Архив",
      desc: "Архивные контракты филиала",
      icon: <InboxOutlined />,
      onClick: () => {
        if (!branchId) {
          message.warning("У вас не привязан филиал");
          return;
        }
        navigate(`/branches/${branchId}/archive`);
      },
      visible: canViewArchive,
    },
    {
      key: "trash",
      title: "Журнал удаление",
      desc: "Удалённые документы: контракты, доп. соглашения, инвойсы, ГТД",
      icon: <DeleteOutlined />,
      onClick: () => navigate("/trash"),
      visible: canViewTrash,
    },

    // === С ЧИСЛАМИ ===
    {
      key: "reports",
      title: "Формирование отчетов",
      desc: "Аналитика по контрактам, инвойсам, ГТД",
      value: typesLoadingReports ? "…" : reportTypesCount,
      icon: <BarChartOutlined />,
      color: "#fa8c16",
      onClick: () => navigate("/reports"),
      visible: canViewReports,
    },
    {
      key: "control",
      title: "Документы на согласовании",
      desc: "Ожидают проверки ВК или Комплаенс",
      value: notificationsTotal ?? 0,
      icon: <SafetyCertificateOutlined />,
      color: "#fa8c16",
      onClick: canViewApprovalsPage
        ? () => navigate("/approvals")
        : undefined,
      visible: canViewApprovals,
    },
  ].filter((a) => a.visible);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* ============ HERO ============ */}
      <Card
        style={{
          borderRadius: 24,
          border: "none",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(230,0,38,0.25)",
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            // ...redGradientBg,
            background: '#8b0000',
            padding: "48px 40px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -80,
              right: 120,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 40,
              left: -40,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <Space size={12} style={{ marginBottom: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#8b0000",
                  backdropFilter: "blur(10px)",
                  border: "1px solid #8b0000",
                }}
              >
                <SafetyCertificateOutlined
                  style={{ fontSize: 26, color: "#fff", }}
                />
              </div>
              <Tag
                style={{
                  background: "#8b0000",
                  color: "#fff",
                  border: "1px solid #8b0000",
                  borderRadius: 999,
                  padding: "4px 14px",
                  fontWeight: 600,
                  fontSize: 12,
                  backdropFilter: "blur(10px)",
                  margin: 0,
                }}
              >
                {roleLabel}
              </Tag>
            </Space>

            <Title
              level={1}
              style={{
                margin: 0,
                color: "#fff",
                fontWeight: 800,
                fontSize: 40,
                letterSpacing: "-0.5px",
                textShadow: "0 4px 20px rgba(0,0,0,0.15)",
              }}
            >
              Добро пожаловать
              <br />
              в Валютный контроль
            </Title>

            <Paragraph
              style={{
                margin: "16px 0 0",
                color: "rgba(255,255,255,0.9)",
                fontSize: 16,
                maxWidth: 640,
                lineHeight: 1.6,
              }}
            >
              {fullName ? (
                <>
                  Здравствуйте, <strong>{fullName}</strong>!{" "}
                </>
              ) : null}
              Единая система управления компаниями, контрактами, инвойсами,
              ГТД и дополнительными соглашениями. Контролируйте сроки,
              согласовывайте документы и управляйте доступами в одном месте.
            </Paragraph>
          </div>
        </div>
      </Card>
      <Card
        style={{
          borderRadius: 18,
          border: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space size={10} style={{ marginBottom: 20 }}>
          <CheckCircleOutlined style={{ color: "#8b0000", fontSize: 18 }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#8b0000' }}>
            Быстрые действия
          </Title>
        </Space>

        <Row gutter={[16, 16]}>
          {quickActions.map((a) => (
            <Col xs={24} sm={12} lg={8} key={a.key}>
              <Tooltip title={a.onClick ? "Нажмите, чтобы перейти" : ""}>
                <Card
                  hoverable={!!a.onClick}
                  onClick={a.onClick}
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(139,0,0,0.06)",
                    cursor: a.onClick ? "pointer" : "default",
                    transition: "all .2s ease",
                    height: "100%",
                  }}
                  bodyStyle={{ padding: 18 }}
                >
                  <Space
                    direction="vertical"
                    size={10}
                    style={{ width: "100%" }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        // ...redGradientBg,
                        background: '#8b0000',
                        color: "#fff",
                        fontSize: 18,
                      }}
                    >
                      {a.icon}
                    </div>
                    <div>
                      <Space
                        align="center"
                        size={8}
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text strong style={{ fontSize: 14 }}>
                          {a.title}
                        </Text>
                        {a.value !== undefined && (
                          <Text
                            strong
                            style={{
                              fontSize: 20,
                              color: a.color || "#e60026",
                              fontWeight: 800,
                            }}
                          >
                            {a.value}
                          </Text>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {a.desc}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Tooltip>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default HomePage;