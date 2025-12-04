export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const cleanJson = (text: string) => {
  if (!text) return "{}";
  const firstOpen = text.indexOf("{");
  const lastClose = text.lastIndexOf("}");
  if (firstOpen !== -1 && lastClose !== -1) {
    return text.substring(firstOpen, lastClose + 1);
  }
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned;
};

/**
 * 安全打印日志，自动隐藏过长的 Base64 字符串
 * @param label 日志标签（方便查找）
 * @param data 要打印的对象、数组或任意变量
 */
export const safeLog = (label: string, data: any) => {
  const cleaned = JSON.stringify(
    data,
    (key, value) => {
      // 1. 如果是字符串
      if (typeof value === "string") {
        // 策略 A: 根据 Key 的名字判断 (更精准)
        if (["data", "base64", "inlineData"].includes(key)) {
          return `[BASE64 DATA HIDDEN] (Length: ${value.length} chars)`;
        }
        
        // 策略 B: 根据长度暴力判断 (防止漏网之鱼)
        // 如果字符串超过 500 字符，且不像是普通的 Prompt，则截断
        if (value.length > 5000) {
          return `${value.substring(0, 5000)}... [TRUNCATED content, total length: ${value.length}]`;
        }
      }
      
      // 2. 特殊处理 Gemini 的 inlineData 结构 (如果上面策略 A 没覆盖到)
      if (key === "inlineData" && value && typeof value === "object") {
         return {
             ...value,
             data: `[BASE64 IMAGE] (Mime: ${value.mimeType}, Length: ${value.data?.length || 0})`
         };
      }
      return value;
    },
    2 // 缩进 2 个空格，美化输出
  );
  console.log(`\n--- [LOG: ${label}] ---\n${cleaned}\n----------------------\n`);
};

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
