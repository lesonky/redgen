import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ImagePlanItem, PlanAnalysis, ReferenceImage, TemplateType } from "../types";

// --- Configuration ---
// Models
const MODEL_TEXT_REASONING = "gemini-3-pro-preview";
const MODEL_IMAGE_GEN = "gemini-3-pro-image-preview";

// --- ROLE TEMPLATES (Xiaohongshu Commercial) ---
type RoleTemplate = {
  description: string;
  creativeFocus: string;
  outputGuide: string[];
};

const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  // --- Type E: 品牌商业 / 新中式 / 高级产品 ---
  "封面大片": {
    description: "品牌主视觉封面，用于整组图片的基调设定。",
    creativeFocus: "一眼看出主角与品牌气质，视觉冲击强、信息简洁。",
    outputGuide: [
      "画面上方约 35–45% 保持干净留白（天空或平滑渐变等）",
      "产品居中或略低于中心，主体占画面 40–60%",
      "预留清晰区域放置主标题和一行短副标题，不要堆积小字"
    ]
  },
  "产品主图": {
    description: "单一产品的权威主图，突出形象与质感。",
    creativeFocus: "让用户在 1 秒内认清产品长什么样，以及它的气质。",
    outputGuide: [
      "产品居中或略偏下，主体占画面 50–70%",
      "背景结构简洁，可有窗框、层次背景或柔和景深，但不能喧宾夺主",
      "一侧或底部预留少量空间用于放置产品名 / 关键卖点 1–2 行"
    ]
  },
  "系列展示": {
    description: "多款产品同屏展示，强调“系列感”和家族一致性。",
    creativeFocus: "让用户感知这是一个完整系列，而不是零散单品。",
    outputGuide: [
      "2–4 个产品以对称或有节奏的方式排列，间距均匀",
      "可以使用简单几何框架来统一整体，不要过度装饰",
      "顶部或中间留出清晰空间，用于写“系列名称 / 系列主张”"
    ]
  },
  "卖点详解": {
    description: "信息型布局，围绕核心产品做卖点拆解。",
    creativeFocus: "让用户快速理解 3–5 个关键卖点，结构清晰可扫读。",
    outputGuide: [
      "产品居中静止，主体比例适中（40–60%）",
      "左右两侧预留信息栏，每侧 1–3 个短标签，可配小图标",
      "背景为干净的浅色渐变或轻纹理，不要放过多装饰元素"
    ]
  },
  "工艺细节": {
    description: "局部特写，放大材质、纹理、工艺细节。",
    creativeFocus: "传达“做工精致、细节讲究”的感觉。",
    outputGuide: [
      "大胆裁切产品，只保留关键细节，占画面 60% 以上",
      "使用浅景深，背景柔和模糊，色调中性或与主题统一",
      "一侧保留狭长空间用于 1–2 行简短说明文字"
    ]
  },
  "购买指南": {
    description: "以“如何选择 / 如何购买”为重点的导购型布局。",
    creativeFocus: "帮助用户做决策，结合产品 + 价格/权益信息。",
    outputGuide: [
      "多款产品可以排成一排或两排，层级分明",
      "画面底部 25–35% 预留为价格 / 优惠信息条",
      "顶部可以有简短标题，如“购买建议 / 套餐对比”，避免大段文字"
    ]
  },
  "品牌故事": {
    description: "带有场景与道具的氛围图，用来讲品牌文化和情绪。",
    creativeFocus: "让用户感受到品牌的气质、历史感或生活方式。",
    outputGuide: [
      "产品靠左或靠右 1/3 位置，保持清晰可见",
      "另一侧保留垂直方向的文案区，用于讲 2–4 行故事文案",
      "场景道具数量有限且主题统一，光线氛围与品牌调性一致"
    ]
  },
  "引导关注": {
    description: "结尾引导卡片，用于提示关注、加好友、进店等。",
    creativeFocus: "让用户清楚下一步要干什么，按钮/指令明确。",
    outputGuide: [
      "背景为单色或轻微纹理，整体尽量简洁",
      "中间或下方预留大号 CTA 文案区域（如“关注我获取更多”）",
      "可以仅有一个小图标或小产品缩略图，不要塞太多元素"
    ]
  },

  // --- Type A, B, C, D (Condensed for brevity, same as before) ---
  "人物展示": {
    description: "人物半身或胸像展示，突出脸部与上身细节。",
    creativeFocus: "强调人物气质、妆容、配饰或与产品的关系。",
    outputGuide: ["人物居中或略偏一侧，上半身占画面约 50%", "另一侧或上方留出区域用于文字说明", "背景模糊、层次柔和"]
  },
  "动态抓拍": {
    description: "带有动作感的抓拍画面，营造真实生活氛围。",
    creativeFocus: "表现“自然、不刻意”的状态，增加亲近感。",
    outputGuide: ["主体略偏一侧，动作方向与留白方向一致", "可允许轻微运动模糊", "一侧保留 20–30% 干净空间"]
  },
  "整体展示": {
    description: "全身或整体造型展示，用于穿搭、体态或空间表现。",
    creativeFocus: "让用户看到“整体效果”，例如整套穿搭。",
    outputGuide: ["人物全身完整呈现", "人物偏一侧", "背景整洁"]
  },
  "情绪特写": {
    description: "近距离的情绪特写，可以是人脸，也可以是手势等。",
    creativeFocus: "放大情绪与情感张力，让用户产生共鸣。",
    outputGuide: ["焦点集中在表情或关键动作上", "背景简单柔和", "预留小面积空间放短句"]
  },
  "材质细节": {
    description: "大面积纹理/材质背景，用于做信息底图。",
    creativeFocus: "让人感受到“摸上去是什么感觉”。",
    outputGuide: ["纹理铺满画面", "顶部或中央预留较干净区域", "颜色层次柔和", "不要混入无关物体"]
  },
  "使用场景": {
    description: "产品在真实或模拟场景中的使用画面。",
    creativeFocus: "帮助用户想象“我用它时是什么样”的情境。",
    outputGuide: ["产品或组合清晰可见", "角落留出空间写步骤/说明", "环境道具有限"]
  },
  "包装展示": {
    description: "强调包装盒、瓶身等外观的专门画面。",
    creativeFocus: "突出包装设计、结构开合、层级感。",
    outputGuide: ["包装主体偏向画面下半部分", "顶部留出标题区域", "辅助道具整齐"]
  },
  "产品全景": {
    description: "标准目录型主图，适合用于电商详情或列表。",
    creativeFocus: "清晰、标准、无干扰地展示产品全貌。",
    outputGuide: ["产品居中或略偏上", "背景纯色或柔和渐变", "画面上下预留位置", "轮廓锐利"]
  },
  "环境展示": {
    description: "宽画幅的空间环境展示，用于介绍店铺/场景氛围。",
    creativeFocus: "让人感受到“这是一个怎么样的空间”。",
    outputGuide: ["主体建筑/空间占画面中部", "上下留出横向条带", "结构线条清晰"]
  },
  "广角全景": {
    description: "超广角全景画面，强调开阔视野或震撼场景。",
    creativeFocus: "营造“大片感”，适合 Vlog 封面或场景介绍。",
    outputGuide: ["地平线稳定", "中部或上部预留标题带", "主体不必过大但层次清晰"]
  },
  "角落一隅": {
    description: "小角落的精致构图，用来表现细腻生活感。",
    creativeFocus: "营造“被发现的小美好”的感觉。",
    outputGuide: ["焦点集中于画面一角", "对角线方向保留留白", "元素少而精"]
  },
  "门头展示": {
    description: "店铺或建筑的门头正面图。",
    creativeFocus: "让用户清晰记住门头长相与招牌文字。",
    outputGuide: ["尽量正面或轻微透视", "上方留出区域", "门头字样清楚"]
  },
  "步骤演示": {
    description: "分步骤展示的操作或过程图。",
    creativeFocus: "逻辑清晰，一眼看出先后顺序。",
    outputGuide: ["手部或产品位于中上方", "四周留白给编号", "每张图只展示一个动作"]
  },
  "对比展示": {
    description: "对比前后、好坏、大小等差异的分屏布局。",
    creativeFocus: "强化“前 vs 后 / A vs B”的差异感。",
    outputGuide: ["画面分屏对称", "中间设置分割线", "每侧只放一个核心对象"]
  },
  "核心卖点": {
    description: "围绕单一产品，突出 3–5 个关键卖点的布局。",
    creativeFocus: "让用户一眼记住“为什么要买它”。",
    outputGuide: ["产品主体大占比", "卖点以点状分布", "卖点数量控制在 3–5 个"]
  },
  "图文详解": {
    description: "大面积图文混排画面，用于做详细说明或教程。",
    creativeFocus: "承载较多信息但依然保持清爽有序。",
    outputGuide: ["主体图片放在一角", "60% 以上区域用于排版文字", "文字分组排版", "背景简洁"]
  }
};

const XIAOHONGSHU_PLAN_ROLES = Object.keys(ROLE_TEMPLATES);

// --- Helper Functions ---
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing in process.env");
  }
  return new GoogleGenAI({ apiKey });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanJson = (text: string) => {
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

// --- API Functions ---

export const generatePlan = async (
  topic: string,
  referenceImages: ReferenceImage[],
  templateType: TemplateType
): Promise<{ analysis: PlanAnalysis; plan: ImagePlanItem[] }> => {
  const ai = getClient();
  const hasReferences = referenceImages.length > 0;

  const imageParts = referenceImages.map((img) => ({
    inlineData: {
      data: img.base64,
      mimeType: img.file.type
    }
  }));

  let systemInstruction = "";
  let prompt = "";
  let planSchema: Schema;

  if (templateType === TemplateType.XIAOHONGSHU) {
    // --- XIAOHONGSHU CONFIGURATION ---
    systemInstruction = `
你是一个为「小红书风格商业图」服务的「视觉创意总监 + 编排设计师」。

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
1. 所有你生成的文本字段必须为「简体中文」。
2. 输出必须是「合法 JSON」。
3. 数量：planItems 总数为 6–9 个。
4. 角色选择：必须从给定的角色列表中选择。
5. 封面：第一张（order = 1）必须是「封面大片」，且只能出现一次。
`;

    prompt = `
任务：为主题「${topic}」生成一套商业图片规划（6–9 张），用于小红书等平台的图文发布。

【步骤说明】
1. 内容分析（analysis）
   - 提取关键词、内容方向、风格方向。
   - 如果有参考图，记录 bestReferenceIndex。

2. 规划图片列表（planItems）
   - 共 6–9 个条目。每一张都要从 ROLE_TEMPLATES 中选一个合适的 role。

3. 每一张图片需要包含：
   - role：从预设列表选择。
   - description：画面内容与氛围描述（<80字）。
   - composition：构图与排版描述，参考 outputGuide。
   - copywriting：画面上的中文文案（主标题/副标题/短句）。
   - layout：详细描述标题、正文的位置和层级。
   - inheritanceFocus：延续的视觉元素。

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

必须严格遵守以下规范：
1. 结构：**第一页必须是「封面」(Cover)**，后续为「Page 1」「Page 2」等。
2. 封面要求：包含大标题、核心角色亮相、具有吸引力的视觉海报感。
3. 内页要求：每页包含页面规格 + 3格以上 Panel 描述。
4. 每格必须包含：详细构图、所有文案（对话/旁白）、排版方式。
5. 风格固定：卡通、明亮、线条干净、适合初中生。
6. 文案为中文，科学术语必须加粗。
7. 科普信息必须准确、易懂、有趣。
8. 输出为 JSON 格式。
`;

    prompt = `
任务：将科普主题「${topic}」改编为一套竖版科普漫画分镜脚本。

【输出要求】
请生成一个 JSON 对象：
1. analysis：分析关键词、核心教学目标。
2. planItems：
   - role：第一张必须是 "Cover"，后续为 "Page 1", "Page 2" 等。
   - description：详细描述这一页的分镜内容。
     * 对于 Cover：描述封面主图、标题位置、角色姿势。
     * 对于 Page X：描述 Panel 1, Panel 2... 的具体画面。
   - composition：描述页面布局。
   - copywriting：本页出现的所有对话和旁白文本。
   - layout：描述文字框的位置。
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

    return { analysis, plan };
  } catch (error) {
    console.error("Plan Generation Error:", error);
    throw new Error("Failed to generate plan. Please try again.");
  }
};

export const generateImageFromPlan = async (
  item: ImagePlanItem,
  referenceImages: ReferenceImage[],
  previousImageBase64: string | undefined,
  analysis: PlanAnalysis | undefined,
  templateType: TemplateType
): Promise<string> => {
  const ai = getClient();
  
  let personaPrompt = "";
  let stylePrompt = "";

  if (templateType === TemplateType.SCIENCE_COMIC) {
    // --- SCIENCE COMIC PERSONA ---
    personaPrompt = `你是一名专业的教育漫画家。你的目标是创作清晰、有趣、适合青少年的科普漫画。`;
    
    // Check if it's a cover
    const isCover = item.role.toLowerCase() === 'cover' || item.role === '封面';

    if (isCover) {
        stylePrompt = `
【漫画封面规范】
- 类型：漫画单行本封面 / 宣传海报。
- 构图：完整的竖版插画（Full Page Illustration），不要分格。
- 视觉重心：核心角色处于画面中心，动作生动夸张，吸引眼球。
- 标题区域：在顶部或底部预留显著的大标题区域（Title Area）。
- 风格：色彩鲜艳、高饱和度、线条清晰的赛璐璐风格或美式卡通风格。
- 氛围：充满活力、趣味性和探索感。
`;
    } else {
        stylePrompt = `
【漫画内页规范】
- 类型：多格分镜漫画（Vertical Scroll Comic / Webtoon Style Page）。
- 构图：这是竖版的一页，包含多个分镜格（Panels）。
- 分镜：严格按照描述中的 Panel 1, Panel 2... 绘制分隔线和画面。
- 风格：背景可以适当简化，突出角色表演和对话空间。
- 线条：干净、清晰的黑色轮廓线。
- 色彩：明亮、鲜艳、饱和度适中，避免过于阴暗。

【Negative Constraints - IMPORTANT】
- DO NOT render text labels like "Page 1", "Panel 1", "Footer", or "Header" inside the image art.
- The image should only contain the visual story content and dialog bubbles.
- No meta-data text.
`;
    }

  } else {
    // --- COMMERCIAL XIAOHONGSHU PERSONA ---
    personaPrompt = `你是一名世界级的「商业产品 CGI 艺术家 + 摄影师」。`;
    stylePrompt = `
【风格与材质】
- 画幅比例：3:4（竖图）。
- 画质：高质量商业渲染，细节清晰，噪点极少。
- 审美：高级、干净、有结构感。
- 高级感建议通过：干净构图、合理留白、精确灯光和材质表现来实现。
`;
  }

  const fullPrompt = `
${personaPrompt}

【全局视觉方向】${
    analysis
      ? `
- 内容方向：${analysis.contentDirection || "（未提供）"}
- 风格方向：${analysis.styleAnalysis || "（未提供）"}
- 关键词：${analysis.keywords?.length ? analysis.keywords.join("，") : "（未提供）"}`
      : `
- 风格：${templateType === TemplateType.SCIENCE_COMIC ? "标准科普漫画风格" : "标准商业视觉风格"}`
  }

【本张图片任务】
- 序号：第 ${item.order} 张
- 角色/页面：${item.role}
- 画面/分镜描述：${item.description}
- 构图/布局要求：${item.composition}
- 布局说明（策划阶段）：${item.layoutSuggestion || "无特别说明"}

${stylePrompt}

【参考图使用规则】
- isMaterial=true：参考主体/角色设计。
- isStyle=true：参考光线/画风/配色。
${templateType === TemplateType.SCIENCE_COMIC ? "- 注意：如果参考图是真实照片，请只提取其角色特征，必须将其转化为【漫画/卡通风格】绘制。" : ""}

【文字与排版（重点）】
- 策划文案：${item.copywriting || "（无文案）"}
- 请将这些文字真实渲染到画面上。
- 自动去掉「主标题」「Panel 1」等说明性前缀，只保留对话或旁白内容。
- ${templateType === TemplateType.SCIENCE_COMIC ? "文字应放在气泡或方形旁白框中。" : "文字应符合商业海报排版。"}
`;

  console.log(`[Image ${item.order} Prompt] (${templateType}):`, fullPrompt);

  const buildParts = (includePrevious: boolean) => {
    const parts: any[] = [];

    // 参考图
    referenceImages.forEach((img, index) => {
      if (!img.isMaterial && !img.isStyle) return;

      parts.push({
        inlineData: {
          data: img.base64,
          mimeType: img.file.type
        }
      });

      let instruction = `[参考图 ${index + 1}] `;
      if (img.isMaterial && img.isStyle) {
        instruction += "【主体 + 风格】同时参考。";
      } else if (img.isStyle) {
        instruction += "【风格参考】只参考光线/配色/画风。";
      } else if (img.isMaterial) {
        instruction += "【主体参考】只参考角色/物体特征。";
      }
      parts.push({ text: instruction });
    });

    // 上一张图
    if (includePrevious && previousImageBase64) {
      parts.push({
        inlineData: {
          data: previousImageBase64,
          mimeType: "image/jpeg"
        }
      });
      parts.push({
        text: "[上一张生成图片]：保持角色/主体身份一致。"
      });
    }

    parts.push({ text: fullPrompt });
    return parts;
  };

  const attemptGeneration = async (parts: any[]) => {
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
    throw new Error("No image data received from API");
  };

  let attempt = 0;
  const maxRetries = 3;

  while (attempt < maxRetries) {
    try {
      const parts = buildParts(true);
      return await attemptGeneration(parts);
    } catch (error: any) {
        // ... (Error handling remains similar, omitted for brevity but should be kept in real code)
       attempt++;
       console.warn(`Retry ${attempt}...`);
       if (attempt >= maxRetries) {
          if (previousImageBase64) {
             return await attemptGeneration(buildParts(false));
          }
          throw error;
       }
       await delay(2000 * attempt);
    }
  }
  throw new Error("Failed to generate image.");
};

export const editGeneratedImage = async (
  imageBase64: string,
  instruction: string
): Promise<string> => {
    // Existing edit logic...
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE_GEN,
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
          { text: `Edit instructions: ${instruction}. Keep aspect ratio 3:4.` }
        ]
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });
    for (const part of (response as any).candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return part.inlineData.data;
    }
    throw new Error("No image data");
};