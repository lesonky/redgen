import { ReferenceImage } from "../types";
import { getClient } from "./gemini-client";
import { MODEL_IMAGE_GEN } from "./gemini-constants";
import { getLastAnalysis, getLastReferenceImages } from "./gemini-state";
import { safeLog } from "./gemini-utils";

export const editGeneratedImage = async (
  imageBase64: string,
  instruction: string
): Promise<string> => {
  const ai = getClient();

  // 使用最近一次 generatePlan 缓存的参考图与分析
  const refs: ReferenceImage[] = Array.isArray(getLastReferenceImages()) ? getLastReferenceImages() : [];
  const analysis = getLastAnalysis();

  let primaryReference: ReferenceImage | undefined;

  if (refs.length > 0) {
    if (analysis?.bestReferenceId) {
      const byBestId = refs.find((img) => img.id === analysis.bestReferenceId);
      if (byBestId) {
        primaryReference = byBestId;
      }
    }
    if (!primaryReference) {
      const materialRef = refs.find((img) => img.isMaterial);
      primaryReference = materialRef || refs[0];
    }
  }

  const parts: any[] = [];

  // 核心参考图（如果有）
  if (primaryReference) {
    parts.push({
      inlineData: {
        data: primaryReference.base64,
        mimeType: primaryReference.mimeType
      }
    });
    parts.push({
      text:
        "【核心身份参考图】保持此图中的人物/产品五官、发型、服饰、logo、外形结构完全一致。编辑时不得改变其基本身份特征。"
    });
  }

  // 其他辅助参考图（如果有）
  refs.forEach((img) => {
    if (!img.isMaterial && !img.isStyle) return;
    if (primaryReference && img.id === primaryReference.id) return;

    parts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType
      }
    });

    parts.push({
      text: "【辅助参考图】参考光线、色调、材质、氛围，不改变主体身份。"
    });
  });

  // 待编辑的图片本体
  parts.push({
    inlineData: {
      data: imageBase64,
      mimeType: "image/jpeg"
    }
  });

  // 文本编辑指令
  parts.push({
    text: `
【编辑任务】
${instruction}

【硬性约束】
- 如果有核心参考图：人物/产品的五官、发型、体态、产品外形、logo 必须与核心参考图保持一致。
- 只在当前画面基础上进行修改，不要完全重绘一个新的主体。
- 尽量局部编辑指定内容，保留已正确的构图与细节。
- 保持画幅比例 3:4。
`
  });

  safeLog("Edit Image Request", parts);

  const response = await ai.models.generateContent({
    model: MODEL_IMAGE_GEN,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
        imageSize: "1K"
      }
    }
  });

  for (const part of (response as any).candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return part.inlineData.data;
  }

  throw new Error("No image data");
};
