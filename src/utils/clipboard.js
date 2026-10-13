// frontend/src/utils/clipboard.js
import { ElMessage } from "element-plus";

/**
 * 复制文本到剪贴板
 * - 优先用 navigator.clipboard（需 HTTPS 或 localhost）
 * - 不支持时降级为 textarea + execCommand
 *
 * @param {string} text 要复制的内容
 * @param {string} successMsg 成功提示，默认 "已复制"
 */
export function copyToClipboard(text, successMsg = "已复制") {
  if (text === null || text === undefined || text === "") {
    ElMessage.warning("没有可复制的内容");
    return;
  }

  const str = String(text);

  const fallback = () => {
    const textarea = document.createElement("textarea");
    textarea.value = str;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    textarea.setAttribute("readonly", "");
    document.body.appendChild(textarea);

    try {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, str.length);
      const ok = document.execCommand("copy");
      if (ok) {
        ElMessage.success(successMsg);
      } else {
        ElMessage.error("复制失败，请手动复制");
      }
    } catch (e) {
      ElMessage.error("复制失败，请手动复制");
    } finally {
      document.body.removeChild(textarea);
    }
  };

  // navigator.clipboard 在 HTTP（非 localhost）下是 undefined
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard
      .writeText(str)
      .then(() => ElMessage.success(successMsg))
      .catch(() => fallback());
  } else {
    fallback();
  }
}
