import {
  Layout as AntLayout,
  Button,
  Menu,
  Typography,
  Divider,
} from "antd";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuth";
import { useBranchesAllStore } from "../store/useBranchesAll";
import activ from "../assets/active.png";

import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

const { Sider, Header, Content, Footer } = AntLayout;
const { Text } = Typography;

const ALL_BRANCHES_ROLES = [
  "admin",
  "compliance",
  "operator",
  "branch_head",
  "currency_control",
  "internal_audit",
];

const Layout = () => {
  const { branchesAll, error, fetchBranchesAll } = useBranchesAllStore();
  const { role, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchBranchesAll();
  }, [fetchBranchesAll]);

  if (error) {
    return (
      <div style={{ color: "#f00", padding: 20, textAlign: "center" }}>
        Ошибка: {error}
      </div>
    );
  }

  const normalizedRole = String(role || "").toLowerCase();
  const canViewAllBranches = ALL_BRANCHES_ROLES.includes(normalizedRole);

  const safeBranches = Array.isArray(branchesAll) ? branchesAll : [];

  const branchMenuItems = safeBranches.map((branch) => ({
    key: `/branches/${branch.id}`,
    label: branch.name,
  }));

  const currentBranchId = location.pathname.startsWith("/branches/")
    ? location.pathname.split("/")[2]
    : null;

  const currentMenuItems = canViewAllBranches
    ? branchMenuItems
    : currentBranchId
      ? branchMenuItems.filter((item) =>
          item.key.endsWith(`/${currentBranchId}`),
        )
      : branchMenuItems;

  const selectedKey = location.pathname.startsWith("/branches/")
    ? location.pathname.split("/").slice(0, 3).join("/")
    : location.pathname;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const topMenuItems = [
    {
      key: "/",
      icon: <HomeOutlined />,
      label: "Главная",
    },
  ];

  return (
    <AntLayout
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #ffffff 0%, #f9fafb 30%, #ffffff 55%, #f1f1f1 100%)",
      }}
    >
      <Sider
        collapsed={collapsed}
        trigger={null}
        width={340}
        collapsedWidth={80}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          height: "100vh",
          overflow: "hidden",
          background: "#8b0000",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 100,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              padding: "0 2px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              position: "relative",
            }}
          >
            <img
              src={activ}
              alt="image"
              style={{
                width: collapsed ? 80 : 100,
                height: collapsed ? 80 : 100,
                borderRadius: "50%",
                objectFit: "cover",
                transition: "all 0.3s ease",
                flexShrink: 0,
              }}
            />
            {!collapsed && (
              <Button
                type="text"
                icon={
                  <MenuFoldOutlined style={{ color: "#fff", fontSize: 16 }} />
                }
                onClick={() => setCollapsed(true)}
                style={{
                  position: "absolute",
                  width: 38,
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "10px",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            )}
          </div>

          {collapsed && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 15,
              }}
            >
              <Button
                type="text"
                icon={
                  <MenuUnfoldOutlined style={{ color: "#fff", fontSize: 16 }} />
                }
                onClick={() => setCollapsed(false)}
                style={{
                  width: 38,
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "10px",
                }}
              />
            </div>
          )}
          <div
            className="branch-menu-scroll"
            style={{ flex: 1, overflowY: "auto", padding: "15px 10px" }}
          >
            <Menu
              mode="inline"
              theme="dark"
              items={topMenuItems}
              onClick={({ key }) => navigate(key)}
              selectedKeys={[selectedKey]}
              style={{
                marginBottom: 15,
                background: "transparent",
                color: "#fff",
              }}
            />

            <Divider
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                margin: "10px 0",
              }}
            />
            <Menu
              mode="inline"
              theme="dark"
              items={currentMenuItems}
              onClick={({ key }) => {
                if (key.startsWith("/branches/")) {
                  navigate(`${key}/dashboard`);
                } else {
                  navigate(key);
                }
              }}
              selectedKeys={[selectedKey]}
              style={{ background: "transparent" }}
            />
          </div>
        </div>
      </Sider>

      <AntLayout
        style={{
          marginLeft: collapsed ? 80 : 340,
          background: "transparent",
          transition: "margin-left 0.2s",
        }}
      >
        <Header
          style={{
            height: 70,
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#8b0000",
              background: "transparent",
            }}
          >
            Валютный контроль
          </div>
          <Button
            type="text"
            icon={<LogoutOutlined style={{color: "#8b0000"}} />}
            onClick={handleLogout}
            style={{
              color: "#8b0000",
              fontSize: 16,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Выход
          </Button>
        </Header>

        <Content
          style={{
            margin: "20px",
            padding: "24px",
            minHeight: "calc(100vh - 110px)",
            borderRadius: "18px",
            background:
              "linear-gradient(135deg, #ffffff 0%, #fafafa 70%, #fff5f5 100%)",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.07)",
            border: "1px solid rgba(139, 0, 0, 0.06)",
          }}
        >
          <Outlet />
        </Content>

        <Footer style={{ background: "transparent", textAlign: "center" }}>
          <Text
            style={{
              background: "transparent",
              color: "#8b0000",              
            }}
          >
            © {new Date().getFullYear()} Валютный контроль
          </Text>
        </Footer>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;