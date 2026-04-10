/**
 * 剪贴板（尤其 iOS Safari）需在用户手势的同步栈内写入。
 * 先走同步 execCommand，再走异步 Clipboard API。
 */

function copyWithExecCommand(value: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.setAttribute("autocomplete", "off");
    ta.setAttribute("autocorrect", "off");
    ta.setAttribute("autocapitalize", "off");
    ta.setAttribute("spellcheck", "false");
    // 避免 iOS 聚焦输入框时页面缩放
    ta.style.fontSize = "16px";
    ta.style.position = "fixed";
    ta.style.left = "0";
    ta.style.top = "0";
    ta.style.width = "2em";
    ta.style.height = "2em";
    ta.style.padding = "0";
    ta.style.margin = "0";
    ta.style.border = "none";
    ta.style.outline = "none";
    ta.style.boxShadow = "none";
    ta.style.background = "transparent";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    ta.style.zIndex = "-1";
    document.body.appendChild(ta);

    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** 同步复制（适合放在 click / touch 回调里，无 await） */
export function copyTextSync(text: string): boolean {
  const value = String(text ?? "");
  if (!value) return false;
  return copyWithExecCommand(value);
}

/** 异步回退：同步失败时再试 Clipboard API（需安全上下文 https/localhost） */
export async function copyText(text: string): Promise<boolean> {
  const value = String(text ?? "");
  if (!value) return false;

  if (copyWithExecCommand(value)) {
    return true;
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* ignore */
  }

  return false;
}

/** 从已渲染的 input/textarea 同步复制（iOS 上更稳） */
export function copyFromInputElement(el: HTMLInputElement | HTMLTextAreaElement | null): boolean {
  if (!el || typeof document === "undefined") return false;
  try {
    const value = el.value;
    if (!value) return false;
    el.focus();
    el.select();
    el.setSelectionRange(0, value.length);
    return document.execCommand("copy");
  } catch {
    return false;
  }
}
