import { Card, Typography, Button } from "antd";
import { ClockCircleOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuthStore } from "../store/useAuth";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const PendingApproval = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #fff1f2, #f5f3ff)",
      }}
    >
      <Card
        style={{
          width: 500,
          borderRadius: 16,
          border: "none",
          boxShadow: "0 15px 40px rgba(0,0,0,0.12)",
          textAlign: "center",
          padding: "40px 20px",
        }}
      >
        <ClockCircleOutlined
          style={{
            fontSize: 64,
            color: "#8b5cf6",
            marginBottom: 20,
          }}
        />
        <Title level={2} style={{ marginBottom: 10 }}>
          Заявка отправлена
        </Title>
        <Text type="secondary" style={{ fontSize: 16, display: "block", marginBottom: 30 }}>
          Ваш запрос на доступ находится на рассмотрении у администратора или комплаенса. 
          Пожалуйста, ожидайте. Мы уведомим вас, как только доступ будет предоставлен.
        </Text>
        <Button
          type="primary"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          size="large"
          style={{
            background: "linear-gradient(90deg, #ff416c, #ff4b2b)",
            border: "none",
            borderRadius: 8,
            height: 46,
            padding: "0 30px",
          }}
        >
          Выйти из системы
        </Button>
      </Card>
    </div>
  );
};

export default PendingApproval;