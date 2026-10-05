import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "../layout/Layout";

import Login from "../pages/Login";
import RequestAccess from "../pages/RequestAccess";
import PendingApproval from "../pages/PendingApproval";
import AccessRequests from "../pages/AccessRequests";
import BranchesManagePage from "../pages/BranchesManagePage";
import BranchDashboard from "../pages/BranchDashboard";
import UsersManagePage from "../pages/UsersManagePage";
import HomePage from "../pages/HomePage";
import AccessRequestsHistory from "../pages/AccessRequestsHistory";
import ArchivePage from "../pages/ArchivePage";
import ApprovalsPage from "../pages/ApprovalsPage";
import ReportsPage from "../pages/ReportsPage";

import { useAuthStore } from "../store/useAuth";
import { ContractsUpdate } from "../pages/ContractsUpdate";
import { InvoicesUpdate } from "../pages/InvoicesUpdate";
import AdditionalAgreements from "../pages/AdditionalAgreements";
import AdditionalAgreementInvoices from "../pages/AdditionalAgreementInvoices";
import GtdUpdate from "../pages/GtdUpdate";
import PaymentOrders from "../pages/PaymentOrders";
import AuditLogs from "../pages/AuditLogs";
import Trash from "../pages/Trash";
import MyDocuments from "../pages/MyDocuments";

const AppRoutes = () => {
  const { accessToken, role, session } = useAuthStore();

  const token = accessToken;
  const branchId = session?.branch_id;

  const normalizedRole = String(role || "").toLowerCase();
  const canManageRequests =
    normalizedRole === "admin" || normalizedRole === "compliance";

  const canViewTrash =
    normalizedRole === "admin" ||
    normalizedRole === "compliance" ||
    normalizedRole === "currency_control";

  const canViewApprovals =
    normalizedRole === "admin" ||
    normalizedRole === "compliance" ||
    normalizedRole === "currency_control";

  // Отчёты — все, кроме operator
  const canViewReports = normalizedRole !== "operator";

  return (
    <Routes>
      {/* === Публичные === */}
      <Route
        path="/login"
        element={
          token && role === "pre_auth" ? (
            <Navigate to="/pending-approval" replace />
          ) : token ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/request-access"
        element={
          token && role === "pre_auth" ? (
            <RequestAccess />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/pending-approval"
        element={
          token && role === "pre_auth" ? (
            <PendingApproval />
          ) : token ? (
            <Navigate to="/" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* === Запросы на доступ === */}
      <Route
        path="/access-requests"
        element={
          token && canManageRequests ? (
            <Layout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<AccessRequests />} />
        <Route path="history" element={<AccessRequestsHistory />} />
      </Route>

      {/* === Основные === */}
      <Route
        path="/"
        element={token ? <Layout /> : <Navigate to="/login" replace />}
      >
        {/* 🏠 ГЛАВНАЯ = HomePage */}
        <Route index element={<HomePage />} />

        <Route path="my-documents" element={<MyDocuments />} />
        <Route path="audit-logs" element={<AuditLogs />} />

        {/* Согласования */}
        <Route
          path="approvals"
          element={
            canViewApprovals ? (
              <ApprovalsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* ✅ Отчёты */}
        <Route
          path="reports"
          element={
            canViewReports ? (
              <ReportsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Управление филиалами */}
        <Route
          path="branches-manage"
          element={
            canManageRequests ? (
              <BranchesManagePage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Управление пользователями */}
        <Route
          path="users-manage"
          element={
            canManageRequests ? (
              <UsersManagePage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="branches/:id"
          element={<Navigate to="dashboard" replace />}
        />

        {/* Архив */}
        <Route path="branches/:id/archive" element={<ArchivePage />} />

        {/* Корзина */}
        <Route
          path="trash"
          element={canViewTrash ? <Trash /> : <Navigate to="/" replace />}
        />

        {/* Дашборд филиала */}
        <Route path="branches/:id/dashboard" element={<BranchDashboard />} />

        {/* Контракты и документы */}
        <Route
          path="branches/:id/companies/:companyId/contracts"
          element={<ContractsUpdate />}
        />
        <Route
          path="branches/:id/companies/:companyId/contracts/:contractId/invoices"
          element={<InvoicesUpdate />}
        />
        <Route
          path="branches/:id/companies/:companyId/contracts/:contractId/additional-agreements"
          element={<AdditionalAgreements />}
        />
        <Route
          path="branches/:id/companies/:companyId/contracts/:contractId/additional-agreements/:agreementId/invoices"
          element={<AdditionalAgreementInvoices />}
        />
        <Route
          path="branches/:id/companies/:companyId/contracts/:contractId/gtd"
          element={<GtdUpdate />}
        />
        <Route
          path="branches/:id/companies/:companyId/contracts/:contractId/invoices/:invoiceId/gtd"
          element={<GtdUpdate />}
        />
        <Route
          path="branches/:id/companies/:companyId/contracts/:contractId/invoices/:invoiceId/payment-orders"
          element={<PaymentOrders />}
        />
      </Route>

      {/* === Fallback === */}
      <Route
        path="*"
        element={
          token && role === "pre_auth" ? (
            <Navigate to="/pending-approval" replace />
          ) : token && canManageRequests && !branchId ? (
            <Navigate to="/access-requests" replace />
          ) : token ? (
            <Navigate to="/" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

export default AppRoutes;