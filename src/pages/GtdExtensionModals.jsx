import { useEffect, useState } from "react";
import {
  Modal, Form, Button, DatePicker, Upload, Table, Tag, Tooltip, Typography, Space, Empty, message,
} from "antd";
import {
  CheckOutlined, CloseOutlined, InboxOutlined, EditOutlined, CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useGtdExtensionStore } from "../store/useGtdExtensionStore";
import DocumentLink from "../pages/DocumentLink";

const { Text } = Typography;
const RED = "#8b0000";

export const EXT_STATUS_MAP = {
  pending: { label: "На рассмотрении", color: "gold" },
  pending_currency_control: { label: "На валютном контроле", color: "orange" },
  pending_compliance: { label: "На комплаенсе", color: "purple" },
  revision_required: { label: "На доработке", color: "volcano" },
  approved: { label: "Одобрено", color: "green" },
  rejected: { label: "Отклонено", color: "red" },
};

const fmt = (v) => (v ? dayjs(v).format("DD.MM.YYYY") : "—");
const errText = (err, fb) =>
  err?.response?.data?.error || err?.response?.data?.detail || err?.response?.data?.message || fb;

// ---------- Форма: подать заявку / доработать ----------
export const GtdExtendModal = ({
  branchId, companyId, contractId, invoiceId, gtd, request, onClose, onSaved,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const editing = !!request;
  const { extend, updateExtension } = useGtdExtensionStore();

  const submit = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    const fd = new FormData();
    fd.append("requested_deadline", dayjs(values.requested_deadline).format("YYYY-MM-DD"));
    const file = values?.document?.[0]?.originFileObj;
    if (file) fd.append("document", file);

    setSubmitting(true);
    try {
      if (editing) {
        await updateExtension(branchId, companyId, contractId, invoiceId, gtd.id, request.id, fd);
        message.success("Заявка обновлена и отправлена на рассмотрение");
      } else {
        await extend(branchId, companyId, contractId, invoiceId, gtd.id, fd);
        message.success("Заявка на продление отправлена в Валютный контроль");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      message.error(errText(err, "Не удалось сохранить заявку"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Modal
        open destroyOnClose maskClosable={false} keyboard={false} width={600}
        title={<span style={{ fontWeight: 700, color: RED, fontSize: 17 }}>
          {editing ? "Доработать заявку на продление" : `Продлить срок ГТД № ${gtd?.gtd_number || ""}`}
        </span>}
        onCancel={() => !submitting && onClose()}
        footer={[
          <Button key="ok" danger type="primary" icon={<CheckOutlined />} loading={submitting}
            onClick={submit} style={{ borderRadius: 10, height: 35, background: RED, border: "none", fontWeight: 600 }}>
            {editing ? "Отправить повторно" : "Отправить заявку"}
          </Button>,
          <Button key="cancel" danger icon={<CloseOutlined />} disabled={submitting}
            onClick={onClose} style={{ borderRadius: 10, height: 35 }}>Отмена</Button>,
        ]}
      >
        <Form form={form} layout="vertical" autoComplete="off"
          initialValues={{
            requested_deadline: request?.requested_deadline ? dayjs(request.requested_deadline) : undefined,
            document: [],
          }}>
          {editing && request?.comment && (
            <div style={{ background: "#fff2e8", borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Комментарий: </Text>
              <Text>{request.currency_control_comment || request.rejection_reason || request.comment}</Text>
            </div>
          )}
          <Form.Item label="Новая дата срока ГТД" name="requested_deadline"
            rules={[{ required: true, message: "Выберите новую дату" }]}>
            <DatePicker style={{ width: "100%", borderRadius: 10 }} format="YYYY-MM-DD"
              placeholder="Выберите дату" />
          </Form.Item>
          <Form.Item
            label={editing ? "Новый документ-обоснование (опционально)" : "Документ-обоснование (PDF)"}
            name="document" valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            rules={editing ? [] : [{ required: true, message: "Загрузите PDF документ" }]}
            extra={editing && request?.document_path ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Текущий файл: <Text code style={{ fontSize: 11 }}>{String(request.document_path).split(/[\\/]/).pop()}</Text>
              </Text>) : null}
          >
            <Upload.Dragger beforeUpload={() => false} maxCount={1} accept=".pdf"
              style={{ borderRadius: 12, background: "#fafafa", borderColor: RED }}>
              <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: RED, fontSize: 36 }} /></p>
              <p className="ant-upload-text" style={{ fontSize: 14, fontWeight: 600 }}>Нажмите или перетащите файл</p>
              <p className="ant-upload-hint" style={{ fontSize: 12, color: "#999" }}>Поддерживается только PDF</p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ---------- История продлений ----------
export const GtdExtensionHistoryModal = ({
  branchId, companyId, contractId, invoiceId, gtd, canEditRequest, onClose,
}) => {
  const { history, isLoading, fetchHistory } = useGtdExtensionStore();
  const [editRecord, setEditRecord] = useState(null);

  const load = () => fetchHistory(branchId, companyId, contractId, invoiceId, gtd.id);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gtd.id]);

  const decision = (d) => {
    if (!d) return <Tag style={{ margin: 0 }}>Ожидает</Tag>;
    const ok = ["approve", "approved", "accepted"].includes(d);
    const rev = d === "revision";
    return <Tag color={ok ? "green" : rev ? "orange" : "red"} style={{ margin: 0 }}>
      {ok ? "Принято" : rev ? "На доработке" : "Отклонено"}</Tag>;
  };

  const columns = [
    { title: "Создана", dataIndex: "created_at", width: 110,
      render: (v) => <Space size={4}><CalendarOutlined style={{ color: RED }} />{fmt(v)}</Space> },
    { title: "Текущий срок", dataIndex: "current_deadline", width: 110, render: fmt },
    { title: "Запрошенный срок", dataIndex: "requested_deadline", width: 130,
      render: (v) => <Text strong style={{ color: "#d946ef" }}>{fmt(v)}</Text> },
    { title: "Статус", dataIndex: "status", width: 150,
      render: (v) => { const i = EXT_STATUS_MAP[v] || { label: v || "—", color: "default" };
        return <Tag color={i.color} style={{ borderRadius: 8, fontWeight: 500 }}>{i.label}</Tag>; } },
    { title: "Валютный контроль", key: "cc", width: 150,
      render: (_, r) => (
        <Tooltip title={r.currency_control_comment || null}>{decision(r.currency_control_decision)}</Tooltip>) },
    { title: "Комплаенс", key: "cmp", width: 130,
      render: (_, r) => (
        <Tooltip title={r.compliance_comment || null}>{decision(r.compliance_decision)}</Tooltip>) },
    { title: "Комментарий", key: "c", width: 200,
      render: (_, r) => <Text style={{ fontSize: 12 }}>{r.rejection_reason || r.comment || "—"}</Text> },
    { title: "Документ", dataIndex: "document_path", width: 180,
      render: (v, r) => <DocumentLink entityType="gtd_extension" entityId={r.id} filePath={v} /> },
    ...(canEditRequest ? [{
      title: "", key: "edit", width: 110,
      render: (_, r) => r.status === "revision_required" ? (
        <Button size="small" type="text" icon={<EditOutlined style={{ color: RED }} />}
          onClick={() => setEditRecord(r)} style={{ color: RED }}>Доработать</Button>) : null,
    }] : []),
  ];

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Modal open destroyOnClose width={1100} footer={null} onCancel={onClose}
        title={<span style={{ fontWeight: 700, color: RED, fontSize: 17 }}>
          История продлений ГТД № {gtd?.gtd_number || ""}</span>}>
        <Table className="red-table" rowKey="id" size="middle" loading={isLoading} columns={columns}
          dataSource={history} pagination={false} scroll={{ x: "max-content" }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Заявок пока нет" /> }} />
      </Modal>

      {editRecord && (
        <GtdExtendModal
          branchId={branchId} companyId={companyId} contractId={contractId}
          invoiceId={invoiceId} gtd={gtd} request={editRecord}
          onClose={() => setEditRecord(null)} onSaved={load}
        />
      )}
    </div>
  );
};