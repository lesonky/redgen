import { Type } from "@google/genai";
import { ReferenceImage, TemplateType, AspectRatio, ImageSize } from "../types";
import { getClient } from "./gemini-client";
import { MODEL_IMAGE_GEN, MODEL_TEXT_REASONING } from "./gemini-constants";
import { cleanJson, safeLog } from "./gemini-utils";

// 0. Auto-fill Suggestions (Improved for structured Style presets)
export const generateInputSuggestions = async (
  topic: string,
  referenceImages: ReferenceImage[],
  templateType: TemplateType
): Promise<{ style: string; content: string }> => {
  const ai = getClient();
  
  const parts: any[] = [];
  
  // Add images to context for material/category clues
  referenceImages.forEach((img, idx) => {
    parts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType
      }
    });
    parts.push({ text: `[Reference Image ${idx + 1}]` });
  });

  const prompt = `
Role: Senior Visual Designer & Content Strategist.
Goal: Expand the user's raw input into professional "style" and "content" fields.

User Input:
- raw topic text: "${topic}"
- template type: "${templateType}"

Instructions for "style" (CRITICAL):
Generate a comprehensive, structured visual style prompt. DO NOT use simple keywords. Use the following bracketed structure based on the template type:

If template is XIAOHONGSHU or PPT:
【视觉基调】 (Overall mood/aesthetic, e.g., high-end commercial, tech-futuristic, warm lifestyle)
【画面元素】 (Key objects, props, lighting details, textures)
【风格约束】 (What to avoid, e.g., no low-quality filters, no 3D if flat is chosen, specific color limits)
【合规与替代】 (Handling sensitive or brand-specific content with generic symbols)
【信息设计】 (Strategy for text overlay, where to put emphasis)
【排版】 (Composition rules, e.g., grid system, centered vs asymmetric)
【语言】 (Instruction to match input language)

If template is SCIENCE_COMIC:
【视觉基调】 (Art style name, e.g., Ghibli-inspired, Chibi, American Superhero)
【画面元素】 (Character design rules, line weight, shading style)
【风格约束】 (Style limits, e.g., no realistic shading, specific color palette)
【叙事风格】 (Storytelling tone, e.g., humorous, poetic, logic-driven)
【分镜与漫画结构】 (Panel logic, camera angles, pacing)

Instructions for "content":
- For Xiaohongshu: 1) Core selling points/conclusions 2) 3-6 bullet points with details 3) Target audience & CTA.
- For PPT: 1) Audience & Purpose 2) 5-8 chapter outline 3) Data/chart requirements for each chapter.
- For Comic: 1) Storyline/concept flow 2) Character roster 3) 4-6 scene node summaries.

Hard Constraints:
- Output MUST be valid JSON only.
- All strings must be in the same language as the user's input topic (likely Chinese).
- The "style" field must be rich, specific, and professional, following the bracketed format exactly.

Return JSON:
{
  "style": "string",
  "content": "string"
}
`;
  
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT_REASONING,
      contents: { role: "user", parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
              style: { type: Type.STRING },
              content: { type: Type.STRING }
          },
          required: ["style", "content"]
        }
      }
    });

    const text = (response as any).text || "{}";
    const json = JSON.parse(cleanJson(text));
    return {
      style: json.style || "",
      content: json.content || ""
    };
  } catch (error) {
    console.error("Auto-fill generation failed", error);
    return { style: "", content: "" };
  }
};

// 1. Generate Concept Analysis & Master Images
export const generateConcept = async (
  topic: string,
  referenceImages: ReferenceImage[],
  templateType: TemplateType,
  aspectRatio: AspectRatio,
  imageSize: ImageSize
): Promise<{ analysisText: string; conceptImages: string[]; artDirection?: string }> => {
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
You are a world-class Social Visual Director specialized in Xiaohongshu cover images.
Your task is to define a "Topic Key Visual" for a single post.

CRITICAL RULES:
1. SUBJECT / CONTENT: Must come strictly from the USER'S TOPIC ("${topic}") and any Reference Images labeled as "MATERIAL".
2. STYLE / AESTHETICS: Must come strictly from Reference Images labeled as "STYLE".
3. GOAL: Create ONE strong, easy-to-recognize cover image that clearly expresses the topic at a glance.
4. FOCUS: One clear main subject as the visual focus; supporting elements should not clutter the frame.
5. COMPOSITION: ${aspectRatio} vertical, suitable for feed thumbnail; reserve a relatively clean area where text overlay COULD be added later (but do NOT describe or draw real UI text).

Do NOT simply repeat or copy a reference image. You must reinterpret the topic through the chosen style (lighting, color, mood).
`;

    analysisPrompt = `
Task: Analyze the user's topic "Topic: ${topic}" and the provided labeled reference images.
Create a visual definition for ONE Xiaohongshu-style topic cover image (Key Visual).

Return a JSON object:

1. "analysis": A concise paragraph explaining:
   - What the main subject is,
   - What mood/emotion the image should convey,
   - How STYLE references are used (lighting, color, overall vibe).

2. "roles": 2–3 short entries describing visual roles in the frame:
   - Example: "Main Subject - steaming hot pot on table", 
             "Supporting Element - chopsticks and side dishes",
             "Background Mood - soft blurred neon city at night".

3. "imagePrompt": A highly detailed prompt for generating this single cover image:
   - Format: ${aspectRatio}.
   - Subject: Directly tied to "${topic}", using MATERIAL references for concrete content.
   - Style: Derived from STYLE refs (lighting, color palette, rendering style).
   - Composition: One clear focal point; supporting elements arranged around it.
   - Keep one area (top or side) relatively clean for potential text overlay (no need to mention text explicitly in the image).
`;
  } else if (templateType === TemplateType.PPT) {
    // PPT / Presentation Slide 方向：这里加 Art Direction
    analysisSystemInstruction = `
You are a Lead Presentation Designer.
Your task is to define a "Master Presentation Theme" image and a reusable Art Direction guide for a slide deck.

CRITICAL RULES:
1. TOPIC: "${topic}" is the core subject of the presentation.
2. STYLE: Infer an appropriate presentation style from the topic and any "STYLE" references.
   Possible styles: Tech/Futuristic, Corporate/Minimalist, Creative/Cartoon, Red/Energy, Academic/Clean.
3. GOAL: 
   - Create a cover-style background image that conveys the topic with a clear visual metaphor or scene,
   - Establish the core color palette and mood,
   - Leave enough clean space for future title and text overlays.
4. ART DIRECTION:
   - You MUST output a detailed Art Direction section that can be reused across all slides (visual style, color, line work, layout rules, typography tone, forbidden elements).
`;

    analysisPrompt = `
Task: Create a Master Presentation Theme for a slide deck about "${topic}".
If references are provided, use "STYLE" refs for color/font/layout inspiration, and "MATERIAL" refs for concrete subject hints.

Return a JSON object:

1. "analysis": A short paragraph describing:
   - The chosen theme (e.g. "futuristic city, abstract data waves"),
   - Why it fits the topic,
   - How the color palette and mood support the presentation context.

2. "roles": 2–3 key visual/design elements that define the theme:
   - Example: "Main Visual Motif - abstract data lines flowing from left to right",
             "Accent Shape - rounded rectangles framing the content area",
             "Light Source - subtle glow from top-right".

3. "artDirection": A detailed Art Direction guide, with sections such as:
   - Illustration / Visual Style (flat vs 3D, abstract vs realistic, level of detail)
   - Line Work (with or without outlines, line thickness, consistency)
   - Composition / Layout (where main visual sits, where negative space is reserved for titles)
   - Shape Language (geometric / rounded / sharp, icon style)
   - Color System (background color tendencies, primary & accent colors, saturation rules)
   - Texture & Depth (flat, slight gradients, glow, etc., and what is forbidden)
   - Typography Tone (title vs body feel: tech, corporate, playful, academic)
   - Mood & Tone (emotion and atmosphere)
   - Forbidden Elements (things that MUST NOT appear for this theme)

4. "imagePrompt": A detailed prompt for the Master Theme Image:
   - Subject: A concept image suitable as a PPT title-slide background for "${topic}".
   - Style: Clean, legible, professional; based on STYLE refs if present.
   - Composition: 
     - Clear main visual area that hints at the topic,
     - Intentional negative space for where title and content will later be placed,
     - No real text, no UI chrome; only shapes, imagery and implied layout.
`;
  } else {
    // 科普漫画 / 漫画方向（不改）
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
   - Pose: Full body, neutral or welcoming; arrange them together in one ${aspectRatio} vertical composition.
   - Art Style: Strictly follow the STYLE reference images.
   - Background: Neutral/Simple.
   - No text, no panels.
`;
  }

  // --- schema 增加 artDirection，可选 ---
  const analysisSchema = {
    type: Type.OBJECT,
    properties: {
      analysis: { type: Type.STRING },
      roles: { type: Type.ARRAY, items: { type: Type.STRING } },
      artDirection: { type: Type.STRING },
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
  const artDirection: string =
    typeof (analysisResult as any).artDirection === "string"
      ? (analysisResult as any).artDirection
      : "";

  let conceptPrompt = "";
  let conceptAnalysis = "";

  if (templateType === TemplateType.PPT) {
    // PPT：在 Prompt + 文本分析里注入 Art Direction
    const artDirForPrompt =
      artDirection && artDirection.trim().length > 0
        ? artDirection
        : "You must still infer a clean, professional, and consistent PPT visual style (colors, shapes, composition, and typography tone) based on the topic and references.";

    conceptPrompt = `${analysisResult.imagePrompt}
    
Global Art Direction (must be followed for all PPT visuals):
${artDirForPrompt}

Key Visual Elements: ${conceptRoles.join(" | ")}.
Make sure the image works as a clean, professional PPT title background with clear negative space for text.`;

    conceptAnalysis = `${analysisResult.analysis}
    
设计要素：${conceptRoles.join(" / ")}
艺术风格指导：
${artDirForPrompt}`;
  } else if (templateType === TemplateType.XIAOHONGSHU) {
    const rolesInstruction =
      conceptRoles.length > 0
        ? `Visual Roles: ${conceptRoles.join(" | ")}. The main subject must be the strongest focal point; supporting elements should enhance, not distract.`
        : "Ensure there is one clear main subject as the focal point, with only a few supporting elements.";
    conceptPrompt = `${analysisResult.imagePrompt}\n\n${rolesInstruction}`;
    conceptAnalysis =
      conceptRoles.length > 0
        ? `${analysisResult.analysis}\n\n画面元素：${conceptRoles.join(" / ")}`
        : analysisResult.analysis;
  } else {
    const rolesInstruction =
      conceptRoles.length > 0
        ? `Composite requirement: show ALL required roles together in one frame: ${conceptRoles.join(" | ")}. Keep them visually distinct and harmonious.`
        : "Composite requirement: include every required role for the task together in one frame (do not omit characters).";
    conceptPrompt = `${analysisResult.imagePrompt}\n\n${rolesInstruction}`;
    conceptAnalysis =
      conceptRoles.length > 0
        ? `${analysisResult.analysis}\n\n角色清单：${conceptRoles.join(" / ")}`
        : analysisResult.analysis;
  }

  // --- 3. 根据模板类型构建出图指令 ---
  let imageGenPrompt = "";
  if (templateType === TemplateType.XIAOHONGSHU) {
    imageGenPrompt = `Generate a ${aspectRatio} vertical Xiaohongshu topic cover image based on this description:
${conceptPrompt}

IMPORTANT:
- The main content MUST clearly relate to: ${topic}.
- Use "MATERIAL" images for concrete subject (objects, people, products).
- Use "STYLE" images for lighting, colors, and overall rendering style.
- One strong focal point, clean composition, high-quality commercial photography or 3D render.
- Keep a relatively clean area where UI text could be placed later, but do NOT draw actual UI text.`;
  } else if (templateType === TemplateType.PPT) {
    imageGenPrompt = `Generate a ${aspectRatio} vertical Master Presentation Theme image based on this description:
${conceptPrompt}

IMPORTANT:
- The visual theme MUST reflect the topic: ${topic}.
- Use "STYLE" images for color palette, mood, and abstract shapes.
- This is a PPT title background: 
  - Do NOT render real text or UI elements.
  - Leave intentional negative space for later title and content.
  - Focus on mood, metaphor, and clean graphic composition.`;
  } else {
    imageGenPrompt = `Generate a ${aspectRatio} vertical Master Character Sheet based on this description:
${conceptPrompt}

IMPORTANT:
- The character(s) MUST be relevant to the topic: ${topic}.
- Use "STYLE" images for drawing style (line weight, shading).
- Clean background, no text.`;
  }

  const imageGenerationParts = [
    ...labeledParts,
    { text: imageGenPrompt }
  ];

  // --- 4. 生成 2 张概念图（并行） ---
  const generateOne = () => {
    safeLog("Concept Image Generation Request", imageGenerationParts);
    return ai.models.generateContent({
      model: MODEL_IMAGE_GEN,
      contents: { parts: imageGenerationParts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: imageSize
        }
      }
    });
  };

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
    conceptImages: generatedBase64s,
    artDirection
  };
};