import { ImagePlanItem, PlanAnalysis, ReferenceImage, TemplateType, AspectRatio } from "../types";
import { getClient } from "./gemini-client";
import { MODEL_IMAGE_GEN } from "./gemini-constants";
import { delay, safeLog } from "./gemini-utils";

export const generateImageFromPlan = async (
  item: ImagePlanItem,
  referenceImages: ReferenceImage[],
  previousImageBase64: string | undefined,
  analysis: PlanAnalysis | undefined,
  templateType: TemplateType,
  outputLanguage: string,
  aspectRatio: AspectRatio
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

  const allowPreviousReference = !!previousImageBase64;

  let personaPrompt = "";
  let stylePrompt = "";

  if (templateType === TemplateType.SCIENCE_COMIC) {
    // --- 科普漫画：主概念图 = 角色设定 + 画风锚点 ---
    personaPrompt = `你是一名专业的教育漫画家。你的目标是创作清晰、有趣、适合青少年的科普漫画，每一页都像同一部连载作品的一部分。`;

    const isCover = item.role.toLowerCase() === "cover" || item.role === "封面";

    if (isCover) {
      stylePrompt = `
【主概念图在漫画中的作用】
- 主概念图 = 「角色设定表 + 画风锚点」。
- 它定义了：角色的五官、发型、服装细节、体型比例、表情气质，以及整体画风（线条、上色、配色）。
- 封面要在这个基础上做「最吸睛的一张海报」，而不是发明全新画风或把角色整容。

【漫画封面规范】
- 类型：漫画单行本封面 / 宣传海报。
- 构图：完整的 ${aspectRatio} 插画（Full Page Illustration），不要分格。
- 视觉重心：核心角色处于画面中心或黄金分割位置，姿势有冲击力。
- 标题区域：在顶部或底部预留显著的大标题区域（Title Area），可以留空白或用简单形状承接文字。
- 风格：线条粗细、上色方式、配色风格必须与「主概念图」保持高度一致，就像同一部连载漫画的封面。
- 氛围：充满活力、趣味性和探索感。`;
    } else {
      stylePrompt = `
【主概念图在漫画中的作用】
- 主概念图 = 整个漫画项目的「角色与画风基准」。
- 你可以改变：镜头、姿势、表情、场景、动作。
- 你不能改变：角色的五官比例、发型服饰、线条风格、上色方式、整体配色倾向。
- 每一页都必须让人一眼看出「这是同一部作品、同一批角色」。

【漫画内页规范】
- 类型：多格分镜漫画（竖版页面）。
- 构图：这是 ${aspectRatio} 的一整页，包含多个分镜格（Panels），严格按照 description 中的 Panel 1, Panel 2... 分隔。
- 分镜：每一格要有清晰的主体与动作，并留出足够空间给对话气泡和旁白框。
- 风格统一性（重点）：
  - 线条风格：粗细统一、干净利落，无多余草稿线。
  - 上色方式：与主概念图一致（赛璐璐 / 柔和渐变 / 扁平等）。
  - 配色倾向：整体色阶、冷暖、明暗与主概念图同一体系。
  - 角色设计：五官、发型、服饰保持完全一致，只改变表情和姿态。

【Negative Constraints - IMPORTANT】
- 不要在画面中绘制 "Page 1", "Panel 1", "Footer", "Header" 等说明性文字。
- 图像只包含故事画面内容 + 对话气泡/旁白框，不要额外添加 UI 元素或提示标注。`;
    }
  } else if (templateType === TemplateType.PPT) {
    // --- PPT：主概念图 = 主题视觉 + 背景风格锚点 ---
    personaPrompt = `你是一名顶尖的 Presentation Designer。你的目标是设计清晰、专业、风格统一的 PPT 幻灯片，每一页都像同一套模板的不同页面。`;

    const artDirectionBlock =
      analysis?.artDirection && analysis.artDirection.trim().length > 0
        ? `
【全局艺术风格指导（Art Direction）】
以下内容定义了本套 PPT 的插画/图形风格、线条规则、形状语言、配色系统、排版语气和禁止项。
本张幻灯片在生成时必须严格遵守这些规则：

${analysis.artDirection}
`
        : `
【全局艺术风格指导（Art Direction）】
（上游未提供完整的艺术风格指导。你仍需保持整套 PPT 在配色、构图、插画/图形风格上的统一性，
风格：干净、扁平、专业、演示友好。）`;

    stylePrompt = `
${artDirectionBlock}

【主概念图在 PPT 中的作用】
- 主概念图 = 本套 PPT 的「主题背景 / 视觉主题锚点」。
- 它定义了：背景的主要图形语言（例如数据线条/几何块面/抽象城市）、主色调和氛围。
- 每一页都是在这个主题下的「变体」，而不是简单复制主概念图：
  - 可以改变：局部图形布局、亮度、背景图案密度。
  - 必须保持：色彩体系、形状语言、光感与整体气质一致。
- 标题和正文区域要与主概念图的留白逻辑兼容。

【PPT 幻灯片设计规范】
- 画幅：${aspectRatio}（适用于演示文稿）。
- 核心：文字排版（Typography）和数据可视化（Charts/Infographics）是画面的主角。
- 背景：基于主概念图的视觉主题作简化/局部重构，避免喧宾夺主。
- 布局：
  - 严格参考 layout 中的标题区、正文区、图表区分布。
  - 留白要充足，避免信息挤在一起。
- 视觉元素：
  - 插画/装饰图形应围绕内容区域，起到引导目光的作用。
  - 图表和要点列表必须清晰、易读、结构化。

【文字渲染】
- 可以在画面中用简化的矩形/线条代表文字区块。
- 允许在标题区域渲染部分可辨认文字，但不要变成花哨字体或乱码。`;
  } else {
    // --- XIAOHONGSHU：主概念图 = KV + 商业风格锚点 ---
    personaPrompt = `你是一名世界级的「商业产品 CGI 艺术家 + 摄影师」，专门为小红书等平台制作整套风格统一的商业图片。`;

    stylePrompt = `
【主概念图在小红书商业图中的作用】
- 主概念图 = 整个系列的「品牌 Key Visual（主 KV） + 风格锚点」。
- 它定义了：
  - 产品/人物的真实外观（形状、比例、颜色）。
  - 灯光类型（硬光/软光/顶光/侧光）、阴影特征。
  - 整体色调、对比度、氛围（冷静 / 温暖 / 清爽 / 高级等）。
- 后续每一张图：
  - 可以改变构图、镜头距离、场景道具。
  - 必须在同一套光线与色彩体系下呈现产品/人物，保持同一品牌感。

【商业视觉规范】
- 画幅比例：${aspectRatio}。
- 画质：高质量商业级摄影或 3D 渲染，细节清晰、无噪点。
- 审美：高级、干净、有结构感，避免廉价滤镜感。
- 内容层级：
  - 产品/主体永远是画面视觉重心。
  - 道具和背景只起到衬托和叙事作用，不抢风头。
- 组图一致性：
  - 所有图片要看起来出自同一场拍摄/同一支视觉团队。
  - 通过配色、光线方向、材质表现和构图习惯保持统一。`;
  }

let textLayoutSection = "";

if (templateType === TemplateType.SCIENCE_COMIC) {
  textLayoutSection = `
【文字与排版（漫画专用）】
- 策划文案（copywriting）：${item.copywriting || "（本页未提供文字脚本，你可以根据分镜需要补充简洁对白与旁白，保持科普信息准确易懂。）"}
- 文本语言：${outputLanguage}。
- 呈现方式：
  - 所有对话内容用「对话气泡」呈现，气泡尾巴指向说话的角色。
  - 说明性、叙述性文字用「旁白框」呈现，通常放在画面上方或分镜空白处。
  - 每一格 Panel 内的文字数量要控制，避免一格塞太多字，保证一眼可以读完。
  - 重要的术语或关键概念可以在文字中加粗（由美术用字体或描边强调）。
- 阅读顺序：
  - 按照从上到下、从左到右的顺序安排对话气泡和旁白框。
  - 同一 Panel 内多个气泡时，注意对话先后顺序，不要交叉混乱。
- 禁忌：
  - 不要在画面中写「Panel 1：」「对白：」「旁白：」这类说明性前缀。
  - 不要在画面中出现脚本式注释文字（如“角色A：……”），只保留真正会被读者看到的对白和旁白。
`;
} else if (templateType === TemplateType.PPT) {
  textLayoutSection = `
【文字与排版（PPT 专用）】
- 策划文案（copywriting）：${item.copywriting || "（本页未提供具体文案，你可以根据本页角色与内容方向自拟合适的标题和要点列。）"}
- 文本语言：${outputLanguage}。
- 层级结构：
  - 必须区分「页标题（Page Title）」「小标题（Section / Block Title）」「正文要点（Bullet Points）」。
  - 页标题字号最大、字重最重，位置通常在上方靠左或居中。
  - 正文内容尽量使用简短的 bullet points，而不是大段连续文字。
- 排版方式：
  - 严格参考本页的 layout 说明，将标题区、内容区、图表区分开。
  - 标题区保持足够留白，不要在标题附近堆叠图形和装饰元素。
  - 正文区可以根据内容使用 1～3 列布局，但每一列的行数要控制，避免过长。
- 文本渲染：
  - 可以在图像中用矩形块、水平线、伪文字条来模拟正文区域，不必逐字写清完整句子。
  - 对于标题，可以尝试渲染清晰可读的文字，使其与主题相关。
- 禁忌：
  - 不要在画面中写「主标题：」「正文：」「列表：」这种脚本说明性前缀。
  - 不要生成扭曲、花哨到影响阅读的艺术字效果，也不要出现乱码式伪文字。
`;
} else {
  // XIAOHONGSHU / 商业图
  textLayoutSection = `
【文字与排版（小红书商业图专用）】
- 策划文案（copywriting）：${item.copywriting || "（本张图未提供文案，你可以根据卖点和画面氛围，自拟简短有记忆点的广告语。）"}
- 文本语言：${outputLanguage}。
- 文案结构建议：
  - 主标题：一句话抓住主题，字数精简、有记忆点，可以放在画面显眼区域。
  - 副标题或补充短句：说明场景、卖点或情绪，可放在主标题附近或画面边缘。
  - 辅助标签/小字：用于价格、活动信息、功能点等，要控制数量，避免信息噪音。
- 排版方式：
  - 主标题与画面主体不要互相抢夺视觉焦点：标题可以压在蒙版区域或干净背景上。
  - 文案应紧贴构图的流线（例如沿着产品顶部的留白带、对角线留白区域排布）。
  - 避免把文字直接覆盖在细节复杂的区域上，如高纹理背景或高对比细节处。
- 文本渲染：
  - 可以完整渲染主标题文案，使其清晰可读。
  - 其他小字可以半抽象呈现（略简化），但保持大致的排版结构与阅读方向。
- 禁忌：
  - 不要在画面中使用「主标题：」「文案：」「标签：」这类说明性字样。
  - 不要堆过量文字，宁可少而有力，也不要变成密密麻麻的文字海报。
`;
}

  const fullPrompt = `
${personaPrompt}

【全局内容与风格方向】${
    analysis
      ? `
- 内容方向：${analysis.contentDirection || "（未提供）"}
- 风格方向：${analysis.styleAnalysis || "（未提供）"}
- 关键词：${analysis.keywords?.length ? analysis.keywords.join("，") : "（未提供）"}`
      : `
- 风格：${templateType === TemplateType.SCIENCE_COMIC ? "标准科普漫画风格" : templateType === TemplateType.PPT ? "专业演示文稿风格" : "标准商业视觉风格"}（以主概念图为准）`
  }

【本张图片任务】
- 序号：第 ${item.order} 张
- 角色/页面：${item.role}
- 画面/内容描述：${item.description}
- 构图/布局要求：${item.composition}
- 布局说明（策划阶段的排版意图）：${item.layoutSuggestion || "无特别说明"}

${stylePrompt}

【参考图使用规则】
- 主概念图（Primary Reference）：
  - 对于科普漫画：它是角色设定与画风锚点，必须严格保持角色长相、线条和上色风格一致。
  - 对于 PPT：它是 PPT 的主题背景与视觉动机，只能在其基础上做变体，而不是复制；要保留相同的色彩与图形语言。
  - 对于小红书商业图：它是整套图的品牌 KV，定义产品/人物外观、光线和色调，后续图片只是换景换构图，不换风格、不换人。
- 其他参考图：
  - 只用于补充光线、材质、场景或道具细节。
  - 不得推翻主概念图所定义的核心风格与主体设定。${
    templateType === TemplateType.SCIENCE_COMIC
      ? `
- 如果参考图是真实照片：只提取形体与场景灵感，以漫画风格重绘。`
      : ""
  }

【上一张生成图的使用】
- 如果提供上一张生成图（例如上一页漫画、上一张 PPT、上一张商业图）：
  - 可以用于场景延续（背景结构、镜头角度、角色/产品大致位置）。
  - 可以用于保持整套作品的连贯感（例如：同一空间、同一桌面、同一灯光环境）。
  - 但最终画风基准仍然是主概念图，不要被上一张图的偶然偏差带跑。
${textLayoutSection}
`;

  console.log(
    `[Image ${item.order} Prompt] (${templateType}) primaryRef=${primaryReference?.id || "none"}, allowPrevious=${allowPreviousReference}，bestReferenceId=${analysis?.bestReferenceId}`
  );

  // --- 构建 parts：核心参考图优先，其次其他参考图，最后（可选）上一张图 ---
  const buildParts = (opts: { includePrevious: boolean }) => {
    const parts: any[] = [];

    // 核心参考图（主概念图）
    if (primaryReference) {
      parts.push({
        inlineData: {
          data: primaryReference.base64,
          mimeType: primaryReference.mimeType
        }
      });

      let primaryExplain = "";

      if (templateType === TemplateType.SCIENCE_COMIC) {
        primaryExplain = "【主概念图（Primary Reference）】这是本项目的角色设定与画风锚点图。所有页面中的角色五官、发型、服饰细节，以及线条风格与上色方式，都必须和这张图保持高度一致，就像同一部漫画作品。";
      } else if (templateType === TemplateType.PPT) {
        primaryExplain = "【主概念图（Primary Reference）】这是本套 PPT 的主题背景与视觉锚点图。后续每页都是对该主题的变体：沿用相同的配色、图形语言和氛围，只在局部构图和图案密度上做调整，不能发明完全不同的风格。";
      } else {
        primaryExplain = "【主概念图（Primary Reference）】这是本系列小红书商业图的品牌 KV 与风格锚点。产品/人物的外观、灯光方向、色调与整体氛围必须和这张图保持高度统一，后续只是更换场景与构图，而不是更换风格或人物。";
      }

      parts.push({ text: primaryExplain });
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
          "【辅助参考图】可以参考其中的光线、材质、场景结构或局部细节，用于丰富当前画面；但不得改变主概念图所确定的主体设定和整体画风。"
      });
    });

    // 上一张生成图
    if (opts.includePrevious && allowPreviousReference && previousImageBase64) {
      parts.push({
        inlineData: {
          data: previousImageBase64,
          mimeType: "image/jpeg"
        }
      });
      parts.push({
        text:
          "【上一张已生成图片】可用于场景连贯性参考（例如同一房间、同一桌面、同一灯光环境），但画风与角色/产品设定仍需以主概念图为最终标准。"
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
          aspectRatio: aspectRatio,
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