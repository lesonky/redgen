import { ReferenceImage, AspectRatio, ImageSize } from "../types";
import { getClient } from "./gemini-client";
import { MODEL_IMAGE_GEN, MODEL_TEXT_REASONING } from "./gemini-constants";
import { getLastAnalysis, getLastReferenceImages } from "./gemini-state";
import { safeLog, cleanJson } from "./gemini-utils";
import { Type } from "@google/genai";

export const optimizeEditPrompt = async (rawPrompt: string): Promise<string> => {
  const ai = getClient();
  const prompt = `
Role: Expert AI Image Prompt Engineer.
Task: Take the user's simple image editing request and expand it into a detailed, professional instruction for an AI image generation model (Gemini).

Original Request: "${rawPrompt}"

Instructions:
- Keep the core intent of the user.
- Add technical details about lighting, textures, composition, or atmosphere if implied.
- Keep it concise but descriptive (2-3 sentences).
- Output the optimized prompt in English for best model compatibility.

Return JSON:
{
  "optimizedPrompt": "string"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { role: "user", parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedPrompt: { type: Type.STRING }
          },
          required: ["optimizedPrompt"]
        }
      }
    });
    const result = JSON.parse(cleanJson((response as any).text || "{}"));
    return result.optimizedPrompt || rawPrompt;
  } catch (e) {
    console.error("Prompt optimization failed", e);
    return rawPrompt;
  }
};

export const editGeneratedImage = async (
  imageBase64: string,
  instruction: string,
  aspectRatio: AspectRatio,
  imageSize: ImageSize
): Promise<string> => {
  const ai = getClient();

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

  if (primaryReference) {
    parts.push({
      inlineData: {
        data: primaryReference.base64,
        mimeType: primaryReference.mimeType
      }
    });
    parts.push({
      text: "【核心身份参考图】保持此图中的人物/产品五官、发型、服饰、logo、外形结构完全一致。编辑时不得改变其基本身份特征。"
    });
  }

  refs.forEach((img) => {
    if (!img.isMaterial && !img.isStyle) return;
    if (primaryReference && img.id === primaryReference.id) return;

    parts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType
      }
    });
    parts.push({ text: "【辅助参考图】参考光线、色调、材质、氛围，不改变主体身份。" });
  });

  parts.push({
    inlineData: {
      data: imageBase64,
      mimeType: "image/jpeg"
    }
  });

  parts.push({
    text: `
【编辑任务】
${instruction}

【硬性约束】
- 如果有核心参考图：人物/产品的五官、发型、体态、产品外形、logo 必须与核心参考图保持一致。
- 只在当前画面基础上进行修改，不要完全重绘一个新的主体。
- 尽量局部编辑指定内容，保留已正确的构图与细节。
- 保持画幅比例 ${aspectRatio}。
`
  });

  safeLog("Edit Image Request", parts);

  const response = await ai.models.generateContent({
    model: MODEL_IMAGE_GEN,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: imageSize
      }
    }
  });

  for (const part of (response as any).candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return part.inlineData.data;
  }

  throw new Error("No image data");
};