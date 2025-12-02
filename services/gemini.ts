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
  封面大片: {
    description: "品牌主视觉封面，用于整组图片的基调设定。",
    creativeFocus: "一眼看出主角与品牌气质，视觉冲击强、信息简洁。",
    outputGuide: [
      "画面上方约 35–45% 保持干净留白（天空或平滑渐变等）",
      "产品居中或略低于中心，主体占画面 40–60%",
      "预留清晰区域放置主标题和一行短副标题，不要堆积小字"
    ]
  },
  产品主图: {
    description: "单一产品的权威主图，突出形象与质感。",
    creativeFocus: "让用户在 1 秒内认清产品长什么样，以及它的气质。",
    outputGuide: [
      "产品居中或略偏下，主体占画面 50–70%",
      "背景结构简洁，可有窗框、层次背景或柔和景深，但不能喧宾夺主",
      "一侧或底部预留少量空间用于放置产品名 / 关键卖点 1–2 行"
    ]
  },
  系列展示: {
    description: "多款产品同屏展示，强调“系列感”和家族一致性。",
    creativeFocus: "让用户感知这是一个完整系列，而不是零散单品。",
    outputGuide: [
      "2–4 个产品以对称或有节奏的方式排列，间距均匀",
      "可以使用简单几何框架来统一整体，不要过度装饰",
      "顶部或中间留出清晰空间，用于写“系列名称 / 系列主张”"
    ]
  },
  卖点详解: {
    description: "信息型布局，围绕核心产品做卖点拆解。",
    creativeFocus: "让用户快速理解 3–5 个关键卖点，结构清晰可扫读。",
    outputGuide: [
      "产品居中静止，主体比例适中（40–60%）",
      "左右两侧预留信息栏，每侧 1–3 个短标签，可配小图标",
      "背景为干净的浅色渐变或轻纹理，不要放过多装饰元素"
    ]
  },
  工艺细节: {
    description: "局部特写，放大材质、纹理、工艺细节。",
    creativeFocus: "传达“做工精致、细节讲究”的感觉。",
    outputGuide: [
      "大胆裁切产品，只保留关键细节，占画面 60% 以上",
      "使用浅景深，背景柔和模糊，色调中性或与主题统一",
      "一侧保留狭长空间用于 1–2 行简短说明文字"
    ]
  },
  购买指南: {
    description: "以“如何选择 / 如何购买”为重点的导购型布局。",
    creativeFocus: "帮助用户做决策，结合产品 + 价格/权益信息。",
    outputGuide: [
      "多款产品可以排成一排或两排，层级分明",
      "画面底部 25–35% 预留为价格 / 优惠信息条",
      "顶部可以有简短标题，如“购买建议 / 套餐对比”，避免大段文字"
    ]
  },
  品牌故事: {
    description: "带有场景与道具的氛围图，用来讲品牌文化和情绪。",
    creativeFocus: "让用户感受到品牌的气质、历史感或生活方式。",
    outputGuide: [
      "产品靠左或靠右 1/3 位置，保持清晰可见",
      "另一侧保留垂直方向的文案区，用于讲 2–4 行故事文案",
      "场景道具数量有限且主题统一，光线氛围与品牌调性一致"
    ]
  },
  引导关注: {
    description: "结尾引导卡片，用于提示关注、加好友、进店等。",
    creativeFocus: "让用户清楚下一步要干什么，按钮/指令明确。",
    outputGuide: [
      "背景为单色或轻微纹理，整体尽量简洁",
      "中间或下方预留大号 CTA 文案区域（如“关注我获取更多”）",
      "可以仅有一个小图标或小产品缩略图，不要塞太多元素"
    ]
  },

  // --- Type A, B, C, D (Condensed) ---
  人物展示: {
    description: "人物半身或胸像展示，突出脸部与上身细节。",
    creativeFocus: "强调人物气质、妆容、配饰或与产品的关系。",
    outputGuide: ["人物居中或略偏一侧，上半身占画面约 50%", "另一侧或上方留出区域用于文字说明", "背景模糊、层次柔和"]
  },
  动态抓拍: {
    description: "带有动作感的抓拍画面，营造真实生活氛围。",
    creativeFocus: "表现“自然、不刻意”的状态，增加亲近感。",
    outputGuide: ["主体略偏一侧，动作方向与留白方向一致", "可允许轻微运动模糊", "一侧保留 20–30% 干净空间"]
  },
  整体展示: {
    description: "全身或整体造型展示，用于穿搭、体态或空间表现。",
    creativeFocus: "让用户看到“整体效果”，例如整套穿搭。",
    outputGuide: ["人物全身完整呈现", "人物偏一侧", "背景整洁"]
  },
  情绪特写: {
    description: "近距离的情绪特写，可以是人脸，也可以是手势等。",
    creativeFocus: "放大情绪与情感张力，让用户产生共鸣。",
    outputGuide: ["焦点集中在表情或关键动作上", "背景简单柔和", "预留小面积空间放短句"]
  },
  材质细节: {
    description: "大面积纹理/材质背景，用于做信息底图。",
    creativeFocus: "让人感受到“摸上去是什么感觉”。",
    outputGuide: ["纹理铺满画面", "顶部或中央预留较干净区域", "颜色层次柔和", "不要混入无关物体"]
  },
  使用场景: {
    description: "产品在真实或模拟场景中的使用画面。",
    creativeFocus: "帮助用户想象“我用它时是什么样”的情境。",
    outputGuide: ["产品或组合清晰可见", "角落留出空间写步骤/说明", "环境道具有限"]
  },
  包装展示: {
    description: "强调包装盒、瓶身等外观的专门画面。",
    creativeFocus: "突出包装设计、结构开合、层级感。",
    outputGuide: ["包装主体偏向画面下半部分", "顶部留出标题区域", "辅助道具整齐"]
  },
  产品全景: {
    description: "标准目录型主图，适合用于电商详情或列表。",
    creativeFocus: "清晰、标准、无干扰地展示产品全貌。",
    outputGuide: ["产品居中或略偏上", "背景纯色或柔和渐变", "画面上下预留位置", "轮廓锐利"]
  },
  环境展示: {
    description: "宽画幅的空间环境展示，用于介绍店铺/场景氛围。",
    creativeFocus: "让人感受到“这是一个怎么样的空间”。",
    outputGuide: ["主体建筑/空间占画面中部", "上下留出横向条带", "结构线条清晰"]
  },
  广角全景: {
    description: "超广角全景画面，强调开阔视野或震撼场景。",
    creativeFocus: "营造“大片感”，适合 Vlog 封面或场景介绍。",
    outputGuide: ["地平线稳定", "中部或上部预留标题带", "主体不必过大但层次清晰"]
  },
  角落一隅: {
    description: "小角落的精致构图，用来表现细腻生活感。",
    creativeFocus: "营造“被发现的小美好”的感觉。",
    outputGuide: ["焦点集中于画面一角", "对角线方向保留留白", "元素少而精"]
  },
  门头展示: {
    description: "店铺或建筑的门头正面图。",
    creativeFocus: "让用户清晰记住门头长相与招牌文字。",
    outputGuide: ["尽量正面或轻微透视", "上方留出区域", "门头字样清楚"]
  },
  步骤演示: {
    description: "分步骤展示的操作或过程图。",
    creativeFocus: "逻辑清晰，一眼看出先后顺序。",
    outputGuide: ["手部或产品位于中上方", "四周留白给编号", "每张图只展示一个动作"]
  },
  对比展示: {
    description: "对比前后、好坏、大小等差异的分屏布局。",
    creativeFocus: "强化“前 vs 后 / A vs B”的差异感。",
    outputGuide: ["画面分屏对称", "中间设置分割线", "每侧只放一个核心对象"]
  },
  核心卖点: {
    description: "围绕单一产品，突出 3–5 个关键卖点的布局。",
    creativeFocus: "让用户一眼记住“为什么要买它”。",
    outputGuide: ["产品主体大占比", "卖点以点状分布", "卖点数量控制在 3–5 个"]
  },
  图文详解: {
    description: "大面积图文混排画面，用于做详细说明或教程。",
    creativeFocus: "承载较多信息但依然保持清爽有序。",
    outputGuide: ["主体图片放在一角", "60% 以上区域用于排版文字", "文字分组排版", "背景简洁"]
  }
};

const XIAOHONGSHU_PLAN_ROLES = Object.keys(ROLE_TEMPLATES);

// --- Internal State Cache for editing ---
let LAST_REFERENCE_IMAGES: ReferenceImage[] = [];
let LAST_ANALYSIS: PlanAnalysis | undefined;

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

// 1. Generate Concept Analysis & Master Images
export const generateConcept = async (
  topic: string,
  referenceImages: ReferenceImage[],
  templateType: TemplateType
): Promise<{ analysisText: string; conceptImages: string[] }> => {
  const ai = getClient();
  const hasReferences = referenceImages.length > 0;

  const imageParts = referenceImages.map((img) => ({
    inlineData: {
      data: img.base64,
      mimeType: img.mimeType
    }
  }));

  // --- 1. 根据模板类型区分「分析角色 + 任务」 ---
  let analysisSystemInstruction = "";
  let analysisPrompt = "";

  if (templateType === TemplateType.XIAOHONGSHU) {
    // 小红书商业视觉方向
    analysisSystemInstruction = `
你是一名世界级「商业视觉总监 / 品牌主视觉摄影指导」。
你的目标是：结合用户的主题${hasReferences ? "和参考图片" : ""}，为一整套小红书商业图定义「统一的视觉身份（Visual Identity）」，
并产出一张可以作为整组图片锚点的「竖版主视觉 KV 概念图」描述。`;

    analysisPrompt = `
任务：分析用户的主题「${topic}」${hasReferences ? "以及参考图片" : ""}，为“小红书风格商业图片”定义一套清晰的视觉风格。

请输出一个 JSON 对象，包含两个字段：

1. "analysis"：使用中文简明描述以下内容（1 段话即可）：
   - 目标受众与品牌气质（例如：年轻、松弛感、高级新中式、科技感等）
   - 推荐的色彩倾向（主色、辅助色，大致明度/饱和度）
   - 光线与质感风格（如：柔和自然光、硬光对比、电影感、磨砂金属、细腻陶瓷等）
   - 场景与构图倾向（如：桌面静物、空间一角、极简纯色背景等）

2. "imagePrompt"：用于生成「3:4 竖版商业主视觉 KV」的详细提示词（中文或英文均可，但要连贯统一），要求：
   - 明确这是社交平台 / 小红书用的 3:4 竖版商业图。
   - 写清楚画面的主角是什么（产品 / 人物 / 场景）以及大致位置。
   - 指出哪里留白、哪里适合放标题和少量文案，但不要真的写出文案内容。
   - 强调品牌气质、产品类型、色彩与光线风格。
   - 不要描述“这是一张概念图 / master image / KV”等元信息，只描述画面本身。`;
  } else {
    // 科普漫画 / 漫画方向
    analysisSystemInstruction = `
You are a Lead Character Designer and Art Director for a science comic series.
Your job is to define the MAIN CHARACTER DESIGN and GLOBAL ART STYLE of the comic,
not just a random illustration.`;

    analysisPrompt = `
Task: Analyze the user's topic "${topic}"${hasReferences ? " and the provided reference images" : ""},
and define a unified main character design + overall art style for a science comic aimed at students.

Return a JSON object with:

1. "analysis":
   A single English paragraph that covers:
   - Target reader age and tone (e.g. fun, energetic, educational, slightly humorous).
   - Recommended art style (chibi vs semi-realistic, line thickness, coloring style such as cel-shading or soft shading).
   - Key character traits that should be visible in design (e.g. curious, energetic, a bit nerdy, confident, etc.).
   - Overall color palette and lighting mood for the comic (e.g. bright and warm, cool and calm, etc.).

2. "imagePrompt":
   A highly detailed prompt to generate a "Master Character & Style Sheet" image:
   - Vertical 3:4 canvas.
   - Show the main character in at least one full-body front pose (neutral or slightly dynamic).
   - Optionally add 1–2 extra small poses or expression busts near the main pose.
   - Background should be simple/neutral so the character design is clearly readable.
   - No speech bubbles, no comic panels, and no text labels like "Front View" or "Side View" – pure art for design reference.`;
  }

  const analysisSchema = {
    type: Type.OBJECT,
    properties: {
      analysis: { type: Type.STRING },
      imagePrompt: { type: Type.STRING }
    },
    required: ["analysis", "imagePrompt"]
  };

  // --- 2. 调用文本模型做「视觉分析 + 概念图 Prompt」 ---
  const analysisResponse = await ai.models.generateContent({
    model: MODEL_TEXT_REASONING,
    contents: {
      role: "user",
      parts: [{ text: analysisPrompt }, ...imageParts]
    },
    config: {
      systemInstruction: analysisSystemInstruction,
      responseMimeType: "application/json",
      responseSchema: analysisSchema
    }
  });

  const analysisResultRaw = (analysisResponse as any).text || "{}";
  const analysisResult = JSON.parse(cleanJson(analysisResultRaw));
  const conceptPrompt: string = analysisResult.imagePrompt;
  const conceptAnalysis: string = analysisResult.analysis;

  // --- 3. 根据模板类型构建出图指令 ---
  const imageGenerationParts = [
    ...imageParts,
    {
      text:
        templateType === TemplateType.XIAOHONGSHU
          ? `Create a high-quality vertical 3:4 commercial key visual image for social media based on the following description:\n${conceptPrompt}\n
Requirements:
- It must look like a polished brand key visual (KV) suitable for Xiaohongshu / Instagram.
- Clear main subject (product or person), tasteful negative space, clean background.
- Lighting and color style should strictly follow the description.`
          : `Create a vertical 3:4 master character & style sheet based on the following description:\n${conceptPrompt}\n
Requirements:
- Show the main character clearly with at least one full-body front pose.
- You may add 1–2 small extra poses or facial expression busts.
- Use a simple, neutral background to keep the design readable.
- No speech bubbles, no comic panels, no UI or text labels – only pure character and style reference art.`
    }
  ];

  // --- 4. 生成 2 张概念图（并行） ---
  const generateOne = () =>
    ai.models.generateContent({
      model: MODEL_IMAGE_GEN,
      contents: { parts: imageGenerationParts },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: "1K"
        }
      }
    });

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
    LAST_REFERENCE_IMAGES = referenceImages;
    LAST_ANALYSIS = analysis;

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
  templateType: TemplateType,
  outputLanguage: string
): Promise<string> => {
  const ai = getClient();

  // --- 1. 选出「主参考图」：优先 bestReferenceId，其次 isMaterial，再退回第一张 ---
  const primaryReference: ReferenceImage | undefined = (() => {
    if (analysis?.bestReferenceId) {
      const byBestId = referenceImages.find((img) => img.id === analysis.bestReferenceId);
      if (byBestId) return byBestId;
    }
    const materialRef = referenceImages.find((img) => img.isMaterial);
    if (materialRef) return materialRef;
    return referenceImages[0];
  })();

  // 有上一张图即视为可用
  const allowPreviousReference = !!previousImageBase64;

  let personaPrompt = "";
  let stylePrompt = "";

  if (templateType === TemplateType.SCIENCE_COMIC) {
    // --- SCIENCE COMIC PERSONA ---
    personaPrompt = `你是一名专业的教育漫画家。你的目标是创作清晰、有趣、适合青少年的科普漫画。`;

    const isCover = item.role.toLowerCase() === "cover" || item.role === "封面";

    if (isCover) {
      stylePrompt = `
【漫画封面规范】
- 类型：漫画单行本封面 / 宣传海报。
- 构图：完整的竖版插画（Full Page Illustration），不要分格。
- 视觉重心：核心角色处于画面中心，动作生动夸张，吸引眼球。
- 标题区域：在顶部或底部预留显著的大标题区域（Title Area）。
- 风格：线条粗细、上色方式、配色风格必须与「主概念图（primary reference）」保持高度一致，就像同一部连载漫画的封面。
- 氛围：充满活力、趣味性和探索感。
`;
    } else {
      stylePrompt = `
【漫画内页规范】
- 类型：多格分镜漫画（Vertical Scroll Comic / Webtoon Style Page）。
- 构图：这是竖版的一页，包含多个分镜格（Panels），严格按照 description 中的 Panel 1, Panel 2... 分隔。
- 分镜：每一格都要有清晰的主体和动作，留出足够空间给对话气泡和旁白框。
- 风格统一性（重点）：
  - 所有内页必须与「主概念图（primary reference）」在画风上保持高度一致：
    * 线条风格（粗细、干净程度）
    * 上色方式（赛璐璐/柔和渐变、阴影处理方式）
    * 配色倾向（主色、辅助色、整体明暗）
  - 角色的五官、发型、服装细节必须和主概念图完全一致，像同一部作品中的同一角色。
  - 可以改变构图、姿势、表情和场景，但不能改变整体画风。

【Negative Constraints - IMPORTANT】
- 不要在画面中绘制 "Page 1", "Panel 1", "Footer", "Header" 等元信息文字。
- 图像中只包含故事画面内容 + 对话气泡/旁白框，不要额外添加界面元素或标注。`;
    }
  } else {
    // --- COMMERCIAL XIAOHONGSHU PERSONA ---
    personaPrompt = `你是一名世界级的「商业产品 CGI 艺术家 + 摄影师」。`;
    stylePrompt = `
【风格与材质（以主概念图为锚点）】
- 画幅比例：3:4（竖图）。
- 画质：高质量商业渲染，细节清晰，噪点极少。
- 审美：高级、干净、有结构感。
- 主概念图（primary reference）定义了本项目的整体风格：
  - 灯光类型与方向（软光/硬光、主光源方向、阴影形状）
  - 色彩倾向（冷暖、饱和度、对比度）
  - 材质质感（例如：金属、陶瓷、玻璃、布料的呈现方式）
- 本张图片必须在此基础上保持统一风格，只调整构图和内容，而不是重新发明一种新风格。`;
  }

  const fullPrompt = `
${personaPrompt}

【全局视觉方向】${analysis
      ? `
- 内容方向：${analysis.contentDirection || "（未提供）"}
- 风格方向：${analysis.styleAnalysis || "（未提供）"}
- 关键词：${analysis.keywords?.length ? analysis.keywords.join("，") : "（未提供）"}`
      : `
- 风格：${templateType === TemplateType.SCIENCE_COMIC ? "标准科普漫画风格（以主概念图为准）" : "标准商业视觉风格（以主概念图为准）"}`
    }

【本张图片任务】
- 序号：第 ${item.order} 张
- 角色/页面：${item.role}
- 画面/分镜描述：${item.description}
- 构图/布局要求：${item.composition}
- 布局说明（策划阶段）：${item.layoutSuggestion || "无特别说明"}

${stylePrompt}

【参考图使用规则（重点说明主概念图）】
- 主概念图（primary reference）：
  - 定义角色的长相、服饰、气质以及整体画风（线条、上色、配色）。
  - 所有页面都必须与主概念图在画风和角色形象上保持高度一致。
- 其他参考图：
  - 只用于补充光线、材质、场景或道具细节。
  - 不得改变主概念图所定义的角色身份和整体画风。
${templateType === TemplateType.SCIENCE_COMIC ? "- 如果参考图是真实照片，只能提取角色特征和场景灵感，并以漫画/卡通风格呈现，与主概念图画风一致。" : ""}

【上一张生成图的使用】
- 如果提供上一张生成图（例如封面或上一页漫画）：
  - 可以用于场景延续（背景结构、镜头角度、角色大致位置）和局部细节参考。
  - 可以帮助保持整个系列在**连贯的视觉语言**下发展（例如某些 recurring 道具、房间布局）。
  - 但角色的五官、服饰细节以及整体画风，仍然必须优先对齐主概念图。
  - 不允许因为上一张图的偶然偏差而偏离主概念图的标准风格。

【文字与排版】
- 策划文案：${item.copywriting || "（无文案）"}
- 文字渲染语言：${outputLanguage}。请确保使用正确的${outputLanguage}字形和字符。
- 请将这些文字真实渲染到画面上：
  - 商业图：以主标题、副标题、卖点短句等形式排版，和留白结构相匹配。
  - 漫画页：以对话气泡和旁白框的形式呈现，不要额外生成多余的大段文字。
- 自动去掉「主标题」「Panel 1」等说明性前缀，只保留对话或旁白的实际内容。`;

  console.log(
    `[Image ${item.order} Prompt] (${templateType}) primaryRef=${primaryReference?.id || "none"}, allowPrevious=${allowPreviousReference}`
  );

  // --- 构建 parts：核心参考图优先，其次其他参考图，最后（可选）上一张图 ---
  const buildParts = (opts: { includePrevious: boolean }) => {
    const parts: any[] = [];

    // 核心参考图（主概念图 / 身份 + 风格锚点）
    if (primaryReference) {
      parts.push({
        inlineData: {
          data: primaryReference.base64,
          mimeType: primaryReference.mimeType
        }
      });
      parts.push({
        text:
          "【主概念图（Primary Reference）】这是本项目的风格与角色锚点图。所有图片中的角色五官、发型、服饰、体型比例，以及线条风格、上色方式和配色，都必须与这张图保持高度一致。"
      });
    }

    // 其他参考图（风格/材质/道具/场景补充）
    referenceImages.forEach((img) => {
      if (!img.isMaterial && !img.isStyle) return;
      if (primaryReference && img.id === primaryReference.id) return;

      parts.push({
        inlineData: {
          data: img.base64,
          mimeType: img.mimeType
        }
      });

      parts.push({
        text:
          "【辅助参考图】可以参考其中的光线、场景结构、道具或局部细节，但不得改变主概念图所确定的角色形象和整体画风。"
      });
    });

    // 上一张生成图（如封面或上一页）
    if (opts.includePrevious && allowPreviousReference && previousImageBase64) {
      parts.push({
        inlineData: {
          data: previousImageBase64,
          mimeType: "image/jpeg"
        }
      });
      parts.push({
        text:
          "【上一张已生成图片】用于参考镜头衔接、场景延续和局部细节（如房间布局、道具位置）。整体画风和角色形象仍然必须以主概念图为准，不要因为上一张图的偶然变化而偏离主风格。"
      });
    }

    // 文本说明放最后
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

  // 优先用「主概念图 + （可选）上一张图」
  while (attempt < maxRetries) {
    try {
      const parts = buildParts({ includePrevious: true });
      return await attemptGeneration(parts);
    } catch (error: any) {
      attempt++;
      console.warn(`Image generation retry with previous (attempt ${attempt}):`, error);
      if (attempt >= maxRetries) {
        break;
      }
      await delay(2000 * attempt);
    }
  }

  // 如果前面都失败，去掉上一张图，只用参考图
  try {
    const parts = buildParts({ includePrevious: false });
    return await attemptGeneration(parts);
  } catch (error: any) {
    console.error("Image Generation Error (without previous):", error);
    throw new Error("Failed to generate image.");
  }
};

export const editGeneratedImage = async (
  imageBase64: string,
  instruction: string
): Promise<string> => {
  const ai = getClient();

  // 使用最近一次 generatePlan 缓存的参考图与分析
  const refs: ReferenceImage[] = Array.isArray(LAST_REFERENCE_IMAGES) ? LAST_REFERENCE_IMAGES : [];
  const analysis = LAST_ANALYSIS;

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