import { Type } from "@google/genai";
import { ReferenceImage, TemplateType } from "../types";
import { getClient } from "./gemini-client";
import { MODEL_IMAGE_GEN, MODEL_TEXT_REASONING } from "./gemini-constants";
import { cleanJson, safeLog } from "./gemini-utils";

// 1. Generate Concept Analysis & Master Images
export const generateConcept = async (
  topic: string,
  referenceImages: ReferenceImage[],
  templateType: TemplateType
): Promise<{ analysisText: string; conceptImages: string[] }> => {
  const ai = getClient();
  const hasReferences = referenceImages.length > 0;

  // Build labeled parts to distinguish between Style and Material references
  const labeledParts: any[] = [];
  
  referenceImages.forEach((img, idx) => {
    const roles: string[] = [];
    if (img.isMaterial) roles.push("MATERIAL/SUBJECT (Shape, Identity, Product Content)");
    if (img.isStyle) roles.push("STYLE/AESTHETIC (Lighting, Color, Art Style)");
    
    // Fallback if no specific tag is selected (implies both)
    if (roles.length === 0) {
        roles.push("General Reference (Both Style & Material)");
    }
    
    labeledParts.push({ text: `[Reference Image ${idx + 1} Usage]: ${roles.join(" + ")}` });
    labeledParts.push({
        inlineData: {
            data: img.base64,
            mimeType: img.mimeType
        }
    });
  });

  // --- 1. 根据模板类型区分「分析角色 + 任务」 ---
  let analysisSystemInstruction = "";
  let analysisPrompt = "";

  if (templateType === TemplateType.XIAOHONGSHU) {
    // 小红书商业视觉方向
    analysisSystemInstruction = `
You are a world-class Visual Director.
Your task is to define a "Master Visual Identity" (KV) for a set of social media images.

CRITICAL RULE:
1. SUBJECT / CONTENT: Must come strictly from the USER'S TOPIC ("${topic}") and any Reference Images labeled as "MATERIAL".
2. STYLE / AESTHETICS: Must come strictly from Reference Images labeled as "STYLE".
3. GOAL: Visualize the subject (Topic + Material Refs) wearing the style (Style Refs).
4. COMPOSITE: Identify every role the campaign needs (hero product、模特/代言人、关键道具等)，并在同一张 3:4 竖图里同时呈现这些角色。

Do NOT simply describe the reference image. You must apply the reference's lighting, color palette, and mood to the *new* subject defined in the topic.
`;

    analysisPrompt = `
Task: Analyze the user's topic "Topic: ${topic}" and the provided labeled reference images.
Create a visual definition that fuses the TOPIC/MATERIAL with the STYLE references.

Return a JSON object:

1. "analysis": A concise paragraph explaining how you are blending the topic and style.
   - Example: "Applying the [Ref 2 - Style] minimalist, high-key medical aesthetic to the [Topic + Ref 1 - Material] spicy hot pot ingredients to create a clean, modern food science vibe."

2. "roles": 2–4 short entries listing every required role/subject that must co-exist in the KV (e.g., "Hero Product - front and center", "Spokesperson - friendly female model", "Key Prop - elevated lacquer tray").

3. "imagePrompt": A highly detailed prompt for generating the Master Key Visual (KV) that places ALL roles together in one frame.
   - Format: 3:4 Vertical.
   - Subject: ${topic} (Focus on the material content) + all roles above simultaneously visible.
   - Style details to extract from Style references: Lighting, Color Palette, Texture, Composition.
   - Composition: Clearly stage every role in one image; keep top 30% clean for potential text overlay.
`;
  } else {
    // 科普漫画 / 漫画方向
    analysisSystemInstruction = `
You are a Lead Character Designer for a Science Comic.
Your goal is to create a "Master Character & Style Sheet".

CRITICAL RULE:
1. CHARACTER/OBJECT ROLE: Defined by the USER'S TOPIC ("${topic}") and any "MATERIAL" references.
2. ART STYLE: Defined by "STYLE" references.
3. GOAL: Create a character/object that fits the TOPIC, drawn in the STYLE of the references.
4. COMPOSITE: 识别本科普任务需要的全部角色（主讲、学生/观众、吉祥物/工具等），并在同一张角色设定图中把他们全部画出来，保证画风一致。
`;

    analysisPrompt = `
Task: Create a character design and art style guide for a comic about "${topic}".
Use the labeled references strictly according to their roles (Material vs Style).

Return a JSON object:

1. "analysis": A short paragraph describing the character concept and how it fits the topic + style.
   - Example: "Designing a [Topic-related Role] character based on [Material Ref], rendered in the [Style Ref] thick-line, flat-color western cartoon style."

2. "roles": List every character/persona required for this topic in one sheet (e.g., "讲解老师 - 温暖专业", "学生听众 - 2 人，男女各 1", "吉祥物机器人 - 负责辅助演示"). These roles must all appear together.

3. "imagePrompt": A detailed prompt for the Master Character Sheet that includes all roles simultaneously.
   - Subject: A roster of characters suitable for explaining "${topic}".
   - Pose: Full body, neutral or welcoming; arrange them together in one 3:4 vertical composition.
   - Art Style: Strictly follow the STYLE reference images.
   - Background: Neutral/Simple.
   - No text, no panels.
`;
  }

  const analysisSchema = {
    type: Type.OBJECT,
    properties: {
      analysis: { type: Type.STRING },
      roles: { type: Type.ARRAY, items: { type: Type.STRING } },
      imagePrompt: { type: Type.STRING }
    },
    required: ["analysis", "roles", "imagePrompt"]
  };

  // --- 2. 调用文本模型做「视觉分析 + 概念图 Prompt」 ---
  const analysisResponse = await ai.models.generateContent({
    model: MODEL_TEXT_REASONING,
    contents: {
      role: "user",
      parts: [...labeledParts, { text: analysisPrompt }]
    },
    config: {
      systemInstruction: analysisSystemInstruction,
      responseMimeType: "application/json",
      responseSchema: analysisSchema
    }
  });

  const analysisResultRaw = (analysisResponse as any).text || "{}";
  const analysisResult = JSON.parse(cleanJson(analysisResultRaw));
  const conceptRoles: string[] = Array.isArray(analysisResult.roles)
    ? analysisResult.roles.filter((r: any) => typeof r === "string")
    : [];
  const rolesInstruction =
    conceptRoles.length > 0
      ? `Composite requirement: show ALL required roles together in one frame: ${conceptRoles.join(" | ")}. Keep them visually distinct and harmonious.`
      : "Composite requirement: include every required role for the task together in one frame (do not omit characters).";
  const conceptPrompt: string = `${analysisResult.imagePrompt}\n\n${rolesInstruction}`;
  const conceptAnalysis: string =
    conceptRoles.length > 0
      ? `${analysisResult.analysis}\n\n角色清单：${conceptRoles.join(" / ")}`
      : analysisResult.analysis;

  // --- 3. 根据模板类型构建出图指令 ---
  const imageGenerationParts = [
    ...labeledParts,
    {
      text:
        templateType === TemplateType.XIAOHONGSHU
          ? `Generate a 3:4 vertical commercial Key Visual (KV) based on this description:\n${conceptPrompt}\n
IMPORTANT:
- The content/subject MUST be about: ${topic}.
- Use "MATERIAL" images for shape/identity.
- Use "STYLE" images for lighting/colors/rendering style.
- High quality, professional photography or 3D render.`
          : `Generate a 3:4 vertical Master Character Sheet based on this description:\n${conceptPrompt}\n
IMPORTANT:
- The character MUST be relevant to the topic: ${topic}.
- Use "STYLE" images for drawing style (line weight, shading).
- Clean background, no text.`
    }
  ];

  // --- 4. 生成 2 张概念图（并行） ---
  const generateOne = () => {
    safeLog("Concept Image Generation Request", imageGenerationParts);
    return ai.models.generateContent({
      model: MODEL_IMAGE_GEN,
      contents: { parts: imageGenerationParts },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: "1K"
        }
      }
    });
  }

  const imageResponses = await Promise.all([generateOne(), generateOne()]);

  const generatedBase64s: string[] = [];
  for (const resp of imageResponses) {
    const parts = (resp as any).candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        generatedBase64s.push(part.inlineData.data);
      }
    }
  }

  if (generatedBase64s.length === 0) {
    throw new Error("Failed to generate concept images.");
  }

  return {
    analysisText: conceptAnalysis,
    conceptImages: generatedBase64s
  };
};
