import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuth";
import { scheduleTokenRefresh } from "../api/auth.service";
import { Button, Form, Input, Alert } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";

const Login = () => {
  const navigate = useNavigate();

  const { login, loading, error } = useAuthStore();

  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    const result = await login(values.login, values.password);

    if (!result.success) return;
    scheduleTokenRefresh();

    const role = result.data?.session?.role ?? result.data?.role ?? null;

    if (role === "pre_auth") {
      localStorage.setItem("role", "pre_auth");
      navigate("/request-access");
      return;
    }

    // ✅ Всегда идём на HomePage
    navigate("/");
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
      <div
        style={{
          width: 420,
          background: "#fff",
          padding: 40,
          borderRadius: 16,
          boxShadow: "0 15px 40px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 700,
              // background: "linear-gradient(90deg, #ff4b4b, #d946ef, #8b5cf6)",
              // WebkitBackgroundClip: "text",
              // WebkitTextFillColor: "transparent",
              color: "#8b0000",
            }}
          >
            Вход в систему
          </h1>

          <p style={{ color: "#888", marginTop: 8, marginBottom: 25 }}>
            Введите логин и пароль
          </p>

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Логин"
              name="login"
              validateTrigger={[]}
              rules={[{ required: true, message: "Введите логин" }]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="Введите логин"
              />
            </Form.Item>

            <Form.Item
              label="Пароль"
              name="password"
              validateTrigger={[]}
              rules={[{ required: true, message: "Введите пароль" }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Введите пароль"
              />
            </Form.Item>

            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{ marginBottom: 20, borderRadius: 8 }}
              />
            )}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                block
                style={{
                  height: 46,
                  borderRadius: 8,
                  border: "none",
                  // background: "linear-gradient(90deg, #ff416c, #ff4b2b)",
                  background: '#8b0000',
                  fontWeight: 600,
                }}
              >
                Войти
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;