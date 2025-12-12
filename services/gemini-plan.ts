import { Schema, Type } from "@google/genai";
import { ImagePlanItem, PlanAnalysis, ReferenceImage, TemplateType, AspectRatio } from "../types";
import { getClient } from "./gemini-client";
import { MODEL_TEXT_REASONING, ROLE_TEMPLATES, XIAOHONGSHU_PLAN_ROLES, PPT_PLAN_ROLES } from "./gemini-constants";
import { setLastAnalysis, setLastReferenceImages } from "./gemini-state";
import { cleanJson } from "./gemini-utils";

// 2. Generate Plan
export const generatePlan = async (
  topic: string,
  referenceImages: ReferenceImage[],
  templateType: TemplateType,
  outputLanguage: string,
  aspectRatio: AspectRatio,
  artDirection?: string  // 新增，可为空
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
- 画面比例为：${aspectRatio}。所有构图必须适配该比例。

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
   - composition：构图与排版描述，必须适配 ${aspectRatio} 比例。
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
  } else if (templateType === TemplateType.PPT) {
    // --- PPT CONFIGURATION ---
    const artDirText =
      artDirection && artDirection.trim().length > 0
        ? artDirection
        : `【注意】当前没有提供上游的艺术风格指导（Art Direction）。
你在规划时仍需隐含保持整套 PPT 在配色、构图、插画/图形风格上的统一性，
但不必在输出中详细书写完整美术规范，只需在 styleAnalysis 中做概括说明。`;

    systemInstruction = `
你是一位「PPT 演示文稿内容策略专家 + 视觉总监」。
你的任务不是随便凑几页，而是围绕主题「${topic}」设计一套**真正可上台演讲的完整 Deck**：
- 逻辑链条完整（有起承转合）
- 每一页都有清晰的「这页在解决什么问题」
- 视觉风格在整套 Deck 中保持统一

【全局风格锚点（Master Style Anchor）】
- 第 0 张参考图是「官方 PPT 风格模板页」。
- 全局的字体风格、配色方案、背景纹理、排版网格都以此为准。
- PPT 的核心：文字排版（Typography）是主角，插画/图形用于解释说明，图表用于数据可视化。
- 目标画面比例：${aspectRatio}。

【全局艺术风格指导（Global Art Direction）】
下面是一份上游生成的艺术风格指导（Art Direction），
它定义了插画/图形风格、线条规则、形状语言、色彩系统、排版语气与禁止项。
你在规划每一页的 description / composition / copywriting / layout 时，都必须遵守这一套规则：

${artDirText}

【整体结构要求】
你需要规划一套 8–12 页的 PPT，建议结构包含并不限于：
1. 封面页：主题、主视觉、演讲人信息。
2. 目录页：清晰展示章节结构。
3. 背景/现状页：说明为什么要关心这个主题，痛点/机会是什么。
4. 问题拆解 / 核心洞察页：把问题拆开讲清楚（可 1–2 页）。
5. 方案/方法论页：用图示或框架展示你的解决方案（可 2–3 页）。
6. 数据/证据页：用数据图表支撑你的观点（至少 1 页）。
7. 落地计划 / Roadmap / Next Steps 页（可选 1 页）。
8. 总结页：回扣主题、列出 3–5 条关键 Takeaways。
9. 结束/Q&A 页：致谢 + 联系方式。

【角色模板（Slide Role）】
你在规划时，需要从预设角色列表中选择合适类型：
- 典型角色包括：${PPT_PLAN_ROLES.join("、")}
- 第一页必须是「封面页」，最后一页通常是「结束页」或带有 Q&A。

【内容优先级】
- 先确保「每一页讲什么」「为什么要这一页」「逻辑如何承接上一页」，再考虑图表/插画。
- 每一页必须有明确的「本页核心信息（One Sentence Takeaway）」。
- 所有生成的文案必须是 ${outputLanguage}，语气适合演讲展示。`;

    prompt = `
任务：为主题「${topic}」设计一份 8–12 页的 PPT 演示文稿结构，并保证所有页面遵守同一套艺术风格指导（Art Direction），且内容逻辑完整、每页信息丰富但不乱。

【参考图说明】
- 第 0 张参考图是「Master Slide Design」。后续所有页面的背景风格、标题位置、配色需与之统一。
- analysis.bestReferenceIndex 优先设为 0。

【analysis 字段要求】
请先输出一个 analysis，用于概括整套 Deck 的策略：

1. keywords：
   - 3–7 个核心关键词，既包含业务/主题关键词，也可以包含情绪/风格关键词。
   - 示例：["大模型应用落地", "成本优化", "自动化", "安全合规", "可视化", "极简科技风"]。

2. contentDirection：
   - 用 2–4 句话说明这套 PPT 的**叙事路径**。
   - 示例（结构示意即可）：
     "先用 1 页说明行业背景和痛点，再用 2 页拆解问题根源，
      然后用 3 页介绍解决方案与架构，再用 2 页用数据与案例证明可行性，
      最后 1 页总结价值并给出下一步行动。"

3. styleAnalysis：
   - 概括本 Deck 的视觉与气质：
     * 色彩倾向（例如：冷色科技、温暖商业、红色正能量）
     * 图形语言（几何块面、线性图标、抽象数据流等）
     * 排版风格（居中大标题、左对齐严谨、卡片式布局等）
   - 可以引用或压缩 Art Direction 的重点，但用你自己的话总结。

4. bestReferenceIndex：
   - 优先设为 0。
   - 如果你认为其他参考图更适合做全局风格锚点，请修改索引，并在 styleAnalysis 里说明原因。

【planItems 字段要求】
接着输出 planItems（8–12 条），每一个代表一页幻灯片。字段解释如下：

1. role：
   - 从以下列表中选择：${PPT_PLAN_ROLES.join(", ")}。
   - 第 1 个 planItem（order = 1）必须是 "封面页"。

2. description（这一页在干什么）：
   - 不是一句废话，而是要同时包含：
     * 本页的**核心目的**（例如：提出问题、给出方案全貌、展示数据对比等）。
     * 本页主要内容块（例如：左侧是痛点列表，右侧是当前做法的局限）。
     * 这页希望给观众留下的感觉/印象（例如：紧迫感、可信度、轻松开场等）。
   - 示例（风格参考）：
     "用一页讲清当前行业在 XXX 方面的三大痛点：
      左侧用图标 + 短句列出「成本高」「效率低」「错误率高」，
      右侧用一段简短说明，现在的常见做法为什么解决不好这些问题，
      整体语气略带紧迫感，为后续方案铺垫。"

3. composition（画面结构 & 区域划分）：
   - 必须体现 ${aspectRatio} 画幅下的布局逻辑，例如：
     * 标题区域在顶部 1 行，左对齐。
     * 左 2/3 是内容区（文字 + 图表），右 1/3 为插画/图示区域。
     * 底部细细一条用作页码或辅助信息。
   - 需要指出主要视觉重心和留白区域（例如：右上角留白用于突出主标题）。
   - 要保证与 Art Direction 中的构图原则一致（如：以对角线引导视线、顶部干净等）。

4. copywriting（具体要写什么文案）：
   - 用一个多行字符串，里面可以包含：
     * PageTitle：本页标题（1 行，简短有力）。
     * Subtitle（可选）：补充说明这页在讲什么。
     * Bullets：3–5 条要点，尽量用短句，适合演讲。
   - 格式示例（仅作为风格参考，不强制固定格式）：
     "PageTitle: XXX 行业的三大现实挑战
      Subtitle: 为什么现在的做法已经不够用了？
      Bullets:
      - 成本持续上涨，人工投入难以压缩
      - 流程复杂，跨部门协作效率低
      - 错误率高，复盘成本巨大"

5. layout（排版与字体语气）：
   - 描述这一页的文字层级与具体排版策略，例如：
     * 标题采用大号无衬线字体，左上角对齐，字间距略微加大。
     * 正文采用两列布局，每列 3–4 行 bullet，列表点采用简单圆点图标。
     * 右侧插画/图表与文字区域的间距要足够，让视觉呼吸顺畅。
   - 要说明本页与全局模板的一致性（例如：沿用统一的标题条、页脚信息条等）。

6. inheritanceFocus（风格继承重点）：
   - 用数组列出本页需要从「主概念图 + 其他页面」继承的元素，例如：
     * ["保留首页的上方深色标题条", "延续数据线条作为背景元素", "沿用同样的图标风格"]
   - 这个字段帮助后续出图阶段保持整套 Deck 的统一性。

【重要约束】
- planItems 的顺序必须形成一个**完整叙事**，不是简单罗列。
- 同一类型的 role 可以出现多次（例如多页「图文内容页」「数据图表页」），但每一页的内容与目的必须不同。
- 输出必须符合上面的 JSON schema 约束，不要包含多余字段。

请严格按 JSON 结构输出。`;

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
              role: { type: Type.STRING, enum: PPT_PLAN_ROLES },
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
请将每个知识点拆解为**一页漫画（${aspectRatio}）**的完整分镜脚本。

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
   - composition：描述页面布局（适配 ${aspectRatio}），并说明大致构图重心。
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
      bestReferenceId,
      artDirection: artDirection || undefined  // ★ 新增这一行
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