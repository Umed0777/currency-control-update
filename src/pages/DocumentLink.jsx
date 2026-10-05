import { useState } from "react";
import { Space, Typography, Tooltip, message, Spin } from "antd";
import { FilePdfOutlined, DownloadOutlined } from "@ant-design/icons";
import { fetchDocumentBlob } from "../api/document.service";

const { Text } = Typography;

/**
 *
 * @param {"contract"|"invoice"|"gtd"|"additional_agreement"|"payment_order"|"gtd_extension"} entityType
 * @param {number|string} entityId
 * @param {string} filePath
 * @param {boolean} showDownload
 */
export const DocumentLink = ({
  entityType,
  entityId,
  filePath,
  showDownload = true,
}) => {
  const [loading, setLoading] = useState(false);

  const fileName = filePath
    ? String(filePath).split(/[\\/]/).pop()
    : "документ";

  const redColor = "#ff0000";

  const openFile = async (e, download = false) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();

    if (!entityId || !entityType) {
      message.warning("Нет данных о документе");
      return;
    }

    setLoading(true);
    try {
      const response = await fetchDocumentBlob(entityType, entityId, download);

      const disposition = response.headers?.["content-disposition"] || "";
      const match = disposition.match(
        /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i
      );
      const serverFileName = match ? decodeURIComponent(match[1]) : fileName;

      const blob = new Blob([response.data], {
        type: response.headers?.["content-type"] || "application/octet-stream",
      });
      const blobUrl = window.URL.createObjectURL(blob);

      if (download) {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = serverFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      }

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      console.error("Ошибка загрузки документа:", err);
      const status = err?.response?.status;

      if (status === 404) {
        message.error("Документ не найден или файл отсутствует");
      } else if (status === 400) {
        message.error("Некорректный ID или тип сущности");
      } else if (status === 401) {
        message.error("Не авторизован");
      } else {
        message.error("Не удалось открыть документ");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!filePath) return <Text type="secondary">—</Text>;

  return (
    <Space size={6}>
      <Tooltip title="Открыть в новой вкладке">
        {loading ? (
          <span
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              minWidth: 120,
            }}
          >
            <Spin
              size="small"
              style={{ color: redColor }}
              indicator={<span style={{ color: redColor }} />}
            />
          </span>
        ) : (
          <Text
            onClick={(e) => openFile(e, false)}
            style={{
              fontSize: 12,
              fontFamily: "monospace",
              color: redColor,
              cursor: "pointer",
              textDecoration: "underline",
              textDecorationStyle: "dotted",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <FilePdfOutlined style={{ color: redColor, paddingRight: 10 }} />
            {fileName}
          </Text>
        )}
      </Tooltip>

      {showDownload && (
        <Tooltip title="Скачать">
          <DownloadOutlined
            onClick={(e) => openFile(e, true)}
            style={{
              color: redColor,
              cursor: loading ? "wait" : "pointer",
              fontSize: 13,
            }}
          />
        </Tooltip>
      )}
    </Space>
  );
};

export default DocumentLink;