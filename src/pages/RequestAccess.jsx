import { useEffect, useState } from "react";
import { Button, Card, Form, Select, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuth";
import { getBranches } from "../api/auth.service";

const RequestAccess = () => {
  const navigate = useNavigate();
  const { requestAccess, getRoles, roles, loading } = useAuthStore();
  const [form] = Form.useForm();
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        setLoadingBranches(true);
        const data = await getBranches();
        const branchData = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
        setBranches(branchData);
      } catch (error) {
        console.error("Ошибка загрузки филиалов:", error);
        message.error(error.response?.data?.message || "Не удалось загрузить филиалы");
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
    getRoles();
  }, [getRoles]);

  const handleSubmit = async (values) => {
    const result = await requestAccess(values.branch_id, values.role);

    if (!result.success) {
      message.error(result.error);
      return;
    }

    message.success(result.data?.message || "Запрос успешно отправлен");
    form.resetFields();

    navigate("/pending-approval", { replace: true });
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
          width: 450,
          borderRadius: 16,
          border: "none",
          boxShadow: "0 15px 40px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 700,
              background: "linear-gradient(90deg, #ff4b4b, #d946ef, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Выбор доступа
          </h1>
          <p style={{ color: "#888", marginTop: 8 }}>Выберите филиал и роль</p>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Филиал"
            name="branch_id"
            rules={[{ required: true, message: "Выберите филиал" }]}
          >
            <Select
              allowClear
              size="large"
              loading={loadingBranches}
              placeholder="Выберите филиал"
              showSearch
              optionFilterProp="label"
              options={branches.map((branch) => ({
                value: branch.id,
                label: branch.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Роль"
            name="role"
            rules={[{ required: true, message: "Выберите роль" }]}
          >
            <Select
              allowClear
              size="large"
              loading={loading}
              placeholder="Выберите роль"
              showSearch
              optionFilterProp="label"
              options={roles.map((item) => ({
                value: item.role ?? item.id ?? item.name,
                label: item.name ?? item.role ?? String(item.id),
              }))}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 25 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{
                height: 46,
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(90deg, #ff416c, #ff4b2b)",
                fontWeight: 600,
              }}
            >
              Отправить запрос
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default RequestAccess;