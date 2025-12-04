import { ImagePlanItem, PlanAnalysis, ReferenceImage, TemplateType } from "../types";
import { getClient } from "./gemini-client";
import { MODEL_IMAGE_GEN } from "./gemini-constants";
import { delay, safeLog } from "./gemini-utils";

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
    `[Image ${item.order} Prompt] (${templateType}) primaryRef=${primaryReference?.id || "none"}, allowPrevious=${allowPreviousReference}，bestReferenceId=${analysis?.bestReferenceId}`
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
    safeLog(`Generating Image ${item.order} (${item.role})`, parts);
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
