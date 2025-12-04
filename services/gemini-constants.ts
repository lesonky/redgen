// Models
export const MODEL_TEXT_REASONING = "gemini-3-pro-preview";
export const MODEL_IMAGE_GEN = "gemini-3-pro-image-preview";

// --- ROLE TEMPLATES (Xiaohongshu Commercial) ---
export type RoleTemplate = {
  description: string;
  creativeFocus: string;
  outputGuide: string[];
};

export const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
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

export const XIAOHONGSHU_PLAN_ROLES = Object.keys(ROLE_TEMPLATES);
