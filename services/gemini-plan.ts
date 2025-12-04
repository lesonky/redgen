import { Schema, Type } from "@google/genai";
import { ImagePlanItem, PlanAnalysis, ReferenceImage, TemplateType } from "../types";
import { getClient } from "./gemini-client";
import { MODEL_TEXT_REASONING, ROLE_TEMPLATES, XIAOHONGSHU_PLAN_ROLES } from "./gemini-constants";
import { setLastAnalysis, setLastReferenceImages } from "./gemini-state";
import { cleanJson } from "./gemini-utils";

// 2. Generate Plan
export const generatePlan = async (
  topic: string,
  referenceImages: ReferenceImage[],
  templateType: TemplateType,
  outputLanguage: string
): Promise<{ analysis: PlanAnalysis; plan: ImagePlanItem[] }> => {
  const ai = getClient();
  const hasReferences = referenceImages.length > 0;

  const imageParts = referenceImages.map((img) => ({
    inlineData: {
      data: img.base64,
      mimeType: img.mimeType
    }
  }));

  let systemInstruction = "";
  let prompt = "";
  let planSchema: Schema;

  if (templateType === TemplateType.XIAOHONGSHU) {
    // --- XIAOHONGSHU CONFIGURATION ---
    systemInstruction = `
你是一个为「小红书风格商业图」服务的「视觉创意总监 + 编排设计师」。

【全局风格锚点（Master Style Anchor）】
- 参考图数组中的第 0 张是「官方风格锚点图」。
- 该锚点图定义了全局视觉风格（色彩、光线、材质、镜头语言等）。
- 如果没有更强理由，请优先将其视为整体项目的风格标准。
- bestReferenceIndex 在合理情况下应优先指向这一张。
- 后续所有图片的角色/产品外观、主要材质与灯光基调必须与该锚点严格统一。

【核心理念：先排版、再风格】
- 你的首要任务是规划每一张图的「角色、排版结构、文字内容和文字位置」。
- 把画面拆成四层：背景 → 道具/台子 → 主体（产品/人物） → 文本层（真实排版的文字）。

【内容 Archetype 选择】
根据用户的主题 ${hasReferences ? "和参考图像" : ""}，选择合适的内容类型：
- Type E：品牌商业 / 新中式 / 高级产品（如酒、茶、护肤、礼盒等）
- Type A：人物 / 穿搭 / 生活方式
- Type B：目录 / 食品 / 3C 产品
- Type C：空间 / 店铺探店 / 建筑
- Type D：信息图 / 教程 / 教育内容

【角色模板（ROLE_TEMPLATES）】
${JSON.stringify(ROLE_TEMPLATES, null, 2)}

【语言与输出要求】
1. 所有你生成的文本字段（尤其是 copywriting）中的**文案内容**必须为「${outputLanguage}」。
2. 输出必须是「合法 JSON」。
3. 数量：planItems 总数为 6–9 个。
4. 角色选择：必须从给定的角色列表中选择。
5. 封面：第一张（order = 1）必须是「封面大片」，且只能出现一次。
`;

    prompt = `
任务：为主题「${topic}」生成一套商业图片规划（6–9 张），用于小红书等平台的图文发布。

【参考图说明】
- 你会收到一组参考图像（如果有）。
- 其中「第 0 张参考图」是已经确认过的「官方风格锚点图」（Master Style Anchor），代表本项目的统一视觉风格。
- 在分析与规划时，请优先以第 0 张的风格为基准，兼顾其他参考图中的有效信息。

【bestReferenceIndex 要求】
- analysis.bestReferenceIndex 用于告诉后续出图流程：你认为哪一张参考图最能代表全局风格。
- 在没有强烈相反理由的前提下，请优先将 bestReferenceIndex 设为 0（即使用第 0 张锚点图）。
- 只有在你确信另一张参考图更适合作为全局风格代表时，才选择其他索引，并在 styleAnalysis 中说明原因。

【步骤说明】
1. 内容分析（analysis）
   - 提取关键词、内容方向、风格方向。
   - 如果有参考图，记录 bestReferenceIndex（建议为 0，除非有特别理由）。
   - 在 styleAnalysis 中，用简洁语言说明整体视觉风格和你对锚点图的理解。

2. 规划图片列表（planItems）
   - 共 6–9 个条目。每一张都要从 ROLE_TEMPLATES 中选一个合适的 role。
   - 第一张（order = 1）必须是「封面大片」，且只能出现一次。
   - 其余图片可以组合使用不同角色模板，形成一套结构完整的商业图文（封面 → 卖点 → 场景 → 细节 → 引导等）。

3. 每一张图片需要包含：
   - role：从预设列表中选择（必须合法）。
   - description：画面内容与氛围描述（<80字，重点描述主体与场景）。
   - composition：构图与排版描述，参考对应 role 的 outputGuide。
   - copywriting：画面上的文案（主标题/副标题/短句）。文案语言：${outputLanguage}。
   - layout：详细描述标题、正文的位置和层级（如：主标题在上方中间，副标题在右下角等）。
   - inheritanceFocus：这一张需要继承前几张中的哪些视觉元素（如：主色、光线方向、主角姿态、品牌标志等），以保证整组图风格统一。

请严格按照 JSON 结构输出。
`;

    planSchema = {
      type: Type.OBJECT,
      properties: {
        analysis: {
          type: Type.OBJECT,
          properties: {
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            contentDirection: { type: Type.STRING },
            styleAnalysis: { type: Type.STRING },
            bestReferenceIndex: { type: Type.INTEGER }
          },
          required: ["keywords", "contentDirection", "styleAnalysis"]
        },
        planItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              order: { type: Type.INTEGER },
              role: { type: Type.STRING, enum: XIAOHONGSHU_PLAN_ROLES },
              description: { type: Type.STRING },
              composition: { type: Type.STRING },
              copywriting: { type: Type.STRING },
              layout: { type: Type.STRING },
              inheritanceFocus: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["order", "role", "description", "composition", "copywriting", "layout"]
          }
        }
      },
      required: ["analysis", "planItems"]
    };
  } else {
    // --- SCIENCE COMIC CONFIGURATION ---
    systemInstruction = `
你现在是一名教育漫画分镜专家。
用户会给你学习主题、目标读者、角色、知识结构。
请将每个知识点拆解为**一页竖版漫画（1080×1440）**的完整分镜脚本。

【全局风格锚点（Master Style Anchor）】
- 参考图数组中的第 0 张是「官方角色与风格锚点图」。
- 该锚点图定义了主角的外观特征（发型、服装、表情气质等）以及整体画风。
- 后续所有页面中的角色表现与线条/上色风格必须与该锚点保持一致。
- analysis.bestReferenceIndex 在合理情况下应优先设为 0。

必须严格遵守以下规范：
1. 结构：**第一页必须是「封面」(Cover)**，后续为「Page 1」「Page 2」等。
2. 封面要求：包含大标题、核心角色亮相、具有吸引力的视觉海报感。
3. 内页要求：每页包含页面规格 + 3格以上 Panel 描述。
4. 每格必须包含：详细构图、所有文案（对话/旁白）、排版方式。
5. 风格固定：卡通、明亮、线条干净、适合初中生。
6. 文案为${outputLanguage}，科学术语必须加粗。
7. 科普信息必须准确、易懂、有趣。
8. 输出为 JSON 格式。
`;

    prompt = `
任务：将科普主题「${topic}」改编为一套竖版科普漫画分镜脚本。

【参考图说明】
- 如果提供参考图，第 0 张为已经确认的「主角 & 画风锚点图」。
- 你需要以第 0 张中的角色外观与画风为基准，统一后续所有页面的角色形象。
- analysis.bestReferenceIndex 用于告诉后续出图流程：你认为哪一张参考图最能代表全局角色和画风，一般应为 0，除非有特殊原因。

【输出要求】
请生成一个 JSON 对象：
1. analysis：
   - keywords：提取本漫画的核心知识点与情绪关键词。
   - contentDirection：整体教学节奏与叙事思路（例如：从日常场景切入 → 抛出问题 → 解释科学概念 → 总结）。
   - styleAnalysis：用简短文字说明整体画风（线条、色彩、角色气质），以及你如何理解锚点图的风格。
   - bestReferenceIndex：优先设为 0（即第 0 张锚点图），除非你有充分理由选其他索引。

2. planItems：
   - role：第一页必须是 "Cover"，后续依次为 "Page 1", "Page 2" 等。
   - description：详细描述这一页的分镜内容。
     * 对于 Cover：描述封面主图、标题位置、角色姿势、背景氛围。
     * 对于 Page X：描述 Panel 1, Panel 2... 每一格的具体画面与情绪。
   - composition：描述页面布局（例如：上大下小三格、竖向分三栏等），并说明大致构图重心。
   - copywriting：本页出现的所有对话和旁白文本。语言：${outputLanguage}。
   - layout：描述文字框（对话气泡、旁白框）的典型位置和排列方式，保证阅读顺畅。

请严格按 JSON 结构输出。
`;

    planSchema = {
      type: Type.OBJECT,
      properties: {
        analysis: {
          type: Type.OBJECT,
          properties: {
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            contentDirection: { type: Type.STRING },
            styleAnalysis: { type: Type.STRING },
            bestReferenceIndex: { type: Type.INTEGER }
          },
          required: ["keywords", "contentDirection", "styleAnalysis"]
        },
        planItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              order: { type: Type.INTEGER },
              role: { type: Type.STRING, description: "Cover, Page 1, Page 2, etc." },
              description: { type: Type.STRING, description: "Full storyboard description with panels" },
              composition: { type: Type.STRING },
              copywriting: { type: Type.STRING },
              layout: { type: Type.STRING },
              inheritanceFocus: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["order", "role", "description", "composition", "copywriting", "layout"]
          }
        }
      },
      required: ["analysis", "planItems"]
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT_REASONING,
      contents: {
        role: "user",
        parts: [{ text: prompt }, ...imageParts]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: planSchema,
        maxOutputTokens: 8192,
        temperature: 1.0
      }
    });

    const cleanText = cleanJson((response as any).text || "{}");
    let result: any;
    try {
      result = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("JSON Parse Error. Raw Text:", (response as any).text);
      throw parseError;
    }

    const bestRefIndex = result.analysis?.bestReferenceIndex;
    const bestReferenceId =
      typeof bestRefIndex === "number" && referenceImages[bestRefIndex]
        ? referenceImages[bestRefIndex].id
        : undefined;

    const analysis: PlanAnalysis = {
      keywords: result.analysis?.keywords || [],
      contentDirection: result.analysis?.contentDirection || "",
      styleAnalysis: result.analysis?.styleAnalysis || "",
      bestReferenceId
    };

    const plan: ImagePlanItem[] = (result.planItems || []).map((item: any) => ({
      id: crypto.randomUUID(),
      order: item.order,
      role: item.role,
      description: item.description,
      composition: item.composition,
      copywriting: item.copywriting,
      layoutSuggestion: item.layout,
      inheritanceFocus: item.inheritanceFocus || []
    }));

    // 缓存本次参考图与分析，用于后续 editGeneratedImage
    setLastReferenceImages(referenceImages);
    setLastAnalysis(analysis);

    return { analysis, plan };
  } catch (error) {
    console.error("Plan Generation Error:", error);
    throw new Error("Failed to generate plan. Please try again.");
  }
};
