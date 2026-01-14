import React, { useRef, useState, useEffect } from 'react';
import { X, Image as ImageIcon, Sparkles, PenTool, Plus, ScanLine, BrainCircuit, Wand2, Globe, ShoppingBag, BookOpen, Palette, ArrowRight, UploadCloud, CheckCircle2, Presentation, Ratio, Layers, AlignLeft, Loader2, Monitor } from 'lucide-react';
import { ReferenceImage, TemplateType, AspectRatio, ImageSize } from '../../types';
import { fileToGenerativePart, generateInputSuggestions } from '../../services/gemini';

interface InputProps {
    mainTopic: string;
    setMainTopic: (t: string) => void;
    styleInput: string;
    setStyleInput: (t: string) => void;
    contentInput: string;
    setContentInput: (t: string) => void;

    referenceImages: ReferenceImage[];
    setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
    selectedTemplate: TemplateType;
    setSelectedTemplate: (t: TemplateType) => void;
    outputLanguage: string;
    setOutputLanguage: (l: string) => void;
    aspectRatio: AspectRatio;
    setAspectRatio: (r: AspectRatio) => void;
    imageSize: ImageSize;
    setImageSize: (s: ImageSize) => void;
    onNext: () => void;
    isProcessing: boolean;
    hasGeneratedConcepts?: boolean;
    onViewExisting?: () => void;
}

const ANALYSIS_STEPS = [
    { label: "Initializing Vision...", sub: "Preparing conceptual models", icon: ScanLine },
    { label: "Analyzing References...", sub: "Extracting core style & identity", icon: Palette },
    { label: "Designing Character/Mood...", sub: "Synthesizing visual elements", icon: BrainCircuit },
    { label: "Generating Master Concepts...", sub: "Rendering high-fidelity preview", icon: Wand2 },
];

const LANGUAGES = [
    "Simplified Chinese",
    "Traditional Chinese",
    "English",
    "Japanese",
    "Korean",
    "Custom"
];

const ASPECT_RATIOS: AspectRatio[] = ["3:4", "9:16", "1:1", "4:3", "16:9"];
const IMAGE_SIZES: ImageSize[] = ["2K", "4K"];

const XIAOHONGSHU_PRESET_STYLES = [
    {
        "title": "高端产品",
        "description": "【视觉基调】\n高端、精致、克制、奢雅，商业大片质感，突出 brand 价值\n\n【画面元素】\n高质感产品主体、极简背景、柔和高级光影、精致材质细节、留白构图\n\n【风格约束】\n避免廉价装饰、避免花哨色彩、避免过度元素堆叠\n\n【合规与替代】\n涉及人物或品牌元素时使用符号化、示意性表达\n\n【信息设计】\n突出产品核心卖点，文案精简有力，每张图一个重点\n\n【排版】\n系列构图统一，视觉风格连贯，便于滑动浏览\n\n【语言】\n精炼高级，符合品牌调性，与输入语言一致"
    },
    {
        "title": "赛博朋克",
        "description": "【视觉基调】\n未来感、科技感、都市夜景氛围，强烈视觉冲击\n\n【画面元素】\n霓虹灯光、全息界面、数字符号、未来城市、机械与电子元素\n\n【风格约束】\n避免真实摄影质感，保持视觉风格高度统一\n\n【合规与替代】\n涉及人物时使用虚拟角色或未来感剪影\n\n【信息设计】\n文案短而有力，突出概念、科技与态度\n\n【排版】\n多图节奏强，构图动感统一，形成系列叙事\n\n【语言】\n偏潮流、未来感，与输入语言一致"
    },
    {
        "title": "卡通漫画",
        "description": "【视觉基调】\n明亮活泼，强情绪表达，年轻化卡通氛围\n\n【画面元素】\n卡通人物、夸张表情、对话框、拟声词、彩色背景\n\n【风格约束】\n避免写实与复杂渲染，保持漫画质感\n\n【合规与替代】\n涉及人物或品牌使用卡通替代形象\n\n【信息设计】\n用剧情或对话传递卖点，增强记忆点\n\n【排版】\n像连载漫画一样形成系列阅读体验\n\n【语言】\n口语化、轻松、有情绪，与输入语言一致"
    },
    {
        "title": "高级扁平",
        "description": "【视觉基调】\n现代、简洁、时尚、设计感强\n\n【画面元素】\n几何图形、扁平插画、抽象元素、克制配色\n\n【风格约束】\n避免复杂装饰，避免真实材质感\n\n【合规与替代】\n涉及人物或品牌时采用抽象化表达\n\n【信息设计】\n重点信息突出，视觉清晰，适合快速浏览\n\n【排版】\n统一网格结构，适合多图连续滑动\n\n【语言】\n理性简洁，与输入语言一致"
    },
    {
        "title": "水墨印象",
        "description": "【视觉基调】\n东方美学，水墨意境，留白充足，文化气质浓厚\n\n【画面元素】\n水墨笔触、山水意象、宣纸肌理、书法文字、印章装饰\n\n【风格约束】\n避免厚重上色与强对比，保持水墨韵味\n\n【合规与替代】\n涉及人物时采用水墨剪影或符号化表现\n\n【信息设计】\n文案简洁，突出主题与情绪氛围\n\n【排版】\n留白充足，画面疏朗，节奏舒缓，适合系列浏览\n\n【语言】\n优雅含蓄，与输入语言一致"
    },
    {
        "title": "包豪斯几何矢量社媒套图",
        "description": "【视觉基调】\n包豪斯风格，高级、设计感强、现代、克制\n\n【画面元素】\n几何模块、半透明色块、抽象符号、分层构图\n\n【色彩策略】\n根据内容气质自动生成包豪斯风格配色方案。几何色块使用半透明填充（透明度 60%~85%），允许颜色叠加产生细腻层次，用于构建统一系列视觉识别\n\n【风格约束】\n全矢量艺术风格，扁平化，无摄影质感，无真实材质，无复杂纹理\n\n【信息设计】\n每张图一个核心信息点，关键词突出，适合快速浏览与连续滑动\n\n【排版】\n系列构图高度统一，节奏稳定，形成品牌级套图风格\n\n【语言】\n简洁有力，与输入语言一致"
    },
    {
        "title": "CLI 科技风格",
        "description": "【视觉基调】\n现代终端与 CLI 视觉风格，极客文化、工程感、未来科技气质，强调系统控制感与交互体验\n\n【画面元素】\n深色终端背景、等宽字体、命令提示符、日志文本、状态输出、进度条、闪烁光标、大型 Pixel ASCII Banner 标题（16-bit 像素块字符）、终端像素艺术\n\n【ASCII 与文字策略】\n支持中文与多语言内容输出。终端界面可展示中文命令、中文系统信息与中文提示。Pixel ASCII Banner 可为中文或英文，不拘泥语言\n\n【交互表现】\n画面呈现类似真实 CLI 交互流程，包括输入、响应、加载、状态更新与反馈，营造动态系统感\n\n【色彩策略】\nPixel ASCII Banner 允许使用渐变色填充，其余终端文本保持高对比单色，确保可读性\n\n【风格约束】\n避免圆润 UI 风格，避免真实摄影质感，整体保持工程与系统美学\n\n【信息设计】\n内容以命令、输出、状态、日志结构组织，突出系统行为与反馈逻辑\n\n【排版】\n仿终端窗口布局，强左对齐，滚动式结构，模块间使用像素或 ASCII 分隔线\n\n【语言】\n语言与输入内容保持一致，允许技术口语与系统提示混合呈现"
    }
];

const PPT_PRESET_STYLES = [
    {
        "title": "手绘风格信息卡",
        "description": "【视觉基调】\n全手绘风格，知识手帐风，课堂白板感觉\n\n【画面元素】\n简洁卡通人物、手绘线条图标、象征性插画、箭头与标记符号\n\n【风格约束】\n禁止写实、禁止摄影感、禁止3D真实渲染，全部采用手绘线条与卡通表现\n\n【合规与替代】\n涉及敏感人物或版权内容时，使用气质相近的卡通替代形象，不拒绝生成\n\n【信息设计】\n信息极简，突出关键词与核心概念，每张画面1~3个核心点，多留白，5秒内可读懂\n\n【排版】\n模块化布局，阅读路径清晰，层级分明\n\n【语言】\n默认语言与输入内容一致"
    },
    {
        "title": "扁平插画风格",
        "description": "【视觉基调】\n现代扁平化插画风格，信息图视觉语言\n\n【画面元素】\n几何化图形、简化人物插画、抽象图标、符号化场景\n\n【风格约束】\n无写实质感，无真实材质，无复杂阴影，保持简洁平面风\n\n【合规与替代】\n涉及敏感或版权形象时，采用抽象或简化替代形象\n\n【信息设计】\n重点信息突出，减少装饰干扰，强调结构清晰与易读性\n\n【排版】\n网格化布局，标题与内容层级清楚\n\n【语言】\n与输入内容语言保持一致"
    },
    {
        "title": "Google 技术风格",
        "description": "【视觉基调】\nGoogle 官方技术风格，Material Design 气质，专业、理性、科技感\n\n【画面元素】\n简洁图标、技术符号、模块块面、流程箭头、信息组件卡片\n\n【风格约束】\n无花哨装饰，无复杂纹理，保持清爽、克制、工程感\n\n【合规与替代】\n涉及人物或具体产品时，使用中性技术符号替代\n\n【信息设计】\n逻辑优先，结构优先，重点明确，减少情绪化表达\n\n【排版】\n强对齐、网格布局、统一间距，专业技术文档级排版\n\n【语言】\n专业技术表达，与输入语言一致"
    },
    {
        "title": "手帐贴纸风格",
        "description": "【视觉基调】\n手帐贴纸风，轻松可爱，生活记录感\n\n【画面元素】\n贴纸元素、可爱卡通人物、小图标、边框标签、装饰符号\n\n【风格约束】\n保持卡通与手绘质感，不出现真实照片或写实元素\n\n【合规与替代】\n涉及人物或品牌时，使用Q版或贴纸化替代形象\n\n【信息设计】\n信息简短，关键词大字呈现，增强记忆点\n\n【排版】\n自由拼贴式布局，阅读顺序清晰\n\n【语言】\n轻松自然，与输入内容一致"
    },
    {
        "title": "党政建设风格",
        "description": "【视觉基调】\n中国大陆党政建设宣传风格，庄重、规范、正式\n\n【画面元素】\n红色主色调，简洁图形，象征性元素（旗帜、徽章、建筑轮廓等）\n\n【风格约束】\n严肃规范，无卡通夸张元素，无娱乐化表达\n\n【合规与替代】\n涉及人物时采用抽象示意或符号化形象\n\n【信息设计】\n突出主题与要点，条理清晰，强调政策导向与核心精神\n\n【排版】\n对称、规整、严谨，政务海报级版式\n\n【语言】\n正式书面语，与输入内容一致"
    },
    {
        "title": "学术报告风格",
        "description": "【视觉基调】\n学术会议 / 研究报告风格，理性、克制、专业\n\n【画面元素】\n图表、结构图、流程图、学术符号、最小化装饰\n\n【风格约束】\n无卡通，无夸张表现，无装饰性图案\n\n【合规与替代】\n人物仅用符号或示意图表示\n\n【信息设计】\n结论优先，数据支撑，逻辑清晰，避免情绪化表达\n\n【排版】\n论文级排版，标题-小标题-正文清晰分级\n\n【语言】\n学术表达，与输入语言一致"
    },
    {
        "title": "数据图表风格",
        "description": "【视觉基调】\n商业数据分析风格，理性、干净、可信\n\n【画面元素】\n柱状图、折线图、饼图、指标卡、数据标签、趋势箭头\n\n【风格约束】\n无装饰性插画，无卡通，无多余元素干扰数据理解\n\n【合规与替代】\n涉及人物或品牌时仅用文字或符号替代\n\n【信息设计】\n突出关键数据与结论，强调对比与趋势\n\n【排版】\n仪表盘式布局，模块清晰，便于快速扫读\n\n【语言】\n商业与分析语气，与输入语言一致"
    },
    {
        "title": "水墨风格",
        "description": "【视觉基调】\n中国传统水墨美学风格，典雅、留白充足、气韵流动\n\n【画面元素】\n水墨人物剪影、山水意象、书法文字、印章元素、宣纸纹理背景\n\n【风格约束】\n非写实风格，避免厚重上色与强对比，保持水墨晕染与宣纸质感\n\n【合规与替代】\n涉及人物或具体形象时，采用水墨剪影或符号化表达\n\n【信息设计】\n信息简练，突出主题与核心观点，图文配合，重意境与节奏\n\n【排版】\n留白充足，布局疏朗，结构平衡，阅读节奏舒缓\n\n【语言】\n语言庄重典雅，与输入内容语言一致"
    },
    {
        "title": "包豪斯几何矢量",
        "description": "【视觉基调】\n包豪斯现代主义风格，理性、秩序、结构美学，克制而高级\n\n【画面元素】\n几何图形（圆、方、三角、粗线条）、模块化构成、留白空间、分层几何结构\n\n【色彩策略】\n基于主题与内容气质自适应生成包豪斯色板。几何色块采用半透明填充（透明度建议 60%~85%），允许叠色产生高级层次感。色彩仅用于几何与文字系统，不影响主体表现\n\n【风格约束】\n全矢量艺术风格，扁平化表现，无摄影质感，无真实材质，无复杂纹理\n\n【信息设计】\n结构优先，层级清晰，重点信息通过几何关系与层次对比表达，减少装饰\n\n【排版】\n严格网格系统，强对齐，留白克制，版式具有建筑感\n\n【语言】\n专业理性，与输入语言一致"
    }
];

const COMIC_PRESET_STYLES = [
    {
        "title": "吉卜力风格漫画",
        "description": "【视觉基调】\n温暖、治愈、富有想象力的日式动画风格，自然气息浓厚，画面柔和舒适\n\n【画面元素】\n手绘感角色、自然场景、生活化道具、柔和光影、富有情绪的环境细节\n\n【风格约束】\n非写实，非摄影感，保持动画绘画质感，色彩柔和不过饱和\n\n【叙事风格】\n温柔叙事，通过日常情境与人物互动传达内容，节奏舒缓，有故事感\n\n【分镜与漫画结构】\n3~6 个 Panel，注重环境与人物情绪变化，镜头切换自然"
    },
    {
        "title": "Q版手绘漫画",
        "description": "【视觉基调】\nQ 版卡通，比例夸张，头大身小，整体可爱治愈\n\n【画面元素】\n圆润线条、可爱表情、简单背景、小道具辅助叙事\n\n【风格约束】\n保持手绘质感，拒绝写实与复杂阴影\n\n【叙事风格】\n轻松幽默，偏情绪表达，适合讲解复杂内容的简化版本\n\n【分镜与漫画结构】\n多使用角色表情变化推动剧情，每格内容简洁明快"
    },
    {
        "title": "中华水墨漫画",
        "description": "【视觉基调】\n中国传统水墨意境，留白丰富，气韵流动\n\n【画面元素】\n水墨人物、山水背景、书法题字、印章装饰\n\n【风格约束】\n避免厚重上色，保持水墨晕染与宣纸质感\n\n【叙事风格】\n诗性表达，偏意境叙事，文字与画面相互映衬\n\n【分镜与漫画结构】\n分镜疏密有致，可不规则布局，重意境与节奏"
    },
    {
        "title": "皮克斯3D漫画",
        "description": "【视觉基调】\n高质量动画电影风格，明亮、温暖、富有表现力\n\n【画面元素】\n表情丰富的角色、清晰灯光层次、夸张动作与电影镜头语言\n\n【风格约束】\n保持动画感，拒绝真实摄影风格\n\n【叙事风格】\n故事性强，情绪推进明显，适合人物成长或问题解决型内容\n\n【分镜与漫画结构】\n镜头语言电影化，远景-中景-特写交替"
    },
    {
        "title": "火柴人漫画",
        "description": "【视觉基调】\n极简线条风格，白板教学与手绘开草图感觉\n\n【画面元素】\n火柴人角色、极简图标、箭头、符号化道具\n\n【风格约束】\n极简，不使用复杂造型与背景\n\n【叙事风格】\n教学感强，逻辑驱动剧情，适合解释概念和流程\n\n【分镜与漫画结构】\n节奏快，信息密度高，每格聚焦一个知识点"
    },
    {
        "title": "JOJO风格漫画",
        "description": "【视觉基调】\n强烈戏剧张力，夸张造型与动作，视觉冲击力极强\n\n【画面元素】\n高对比色彩、夸张姿势、巨大拟声词、强烈构图\n\n【风格约束】\n保持漫画夸张感，拒绝写实自然比例\n\n【叙事风格】\n热血、紧张、情绪爆发式表达\n\n【分镜与漫画结构】\n节奏变化大，常用大画幅 Panel 强化高潮"
    },
    {
        "title": "美式超级英雄漫画",
        "description": "【视觉基调】\n美式漫画风，力量感强，戏剧化光影\n\n【画面元素】\n英雄角色、动态构图、夸张动作、速度线、爆炸效果\n\n【风格约束】\n保持漫画感，不使用真实电影镜头风格\n\n【叙事风格】\n正邪冲突，目标明确，问题-挑战-胜利结构\n\n://分镜与漫画结构\n分镜节奏快，动作导向，画面冲击力强"
    },
    {
        "title": "辛普森一家风格漫画",
        "description": "【视觉基调】\n明亮扁平，美式幽默，夸张卡通造型\n\n【画面元素】\n简化人物轮廓、鲜艳配色、家庭生活场景\n\n【风格约束】\n平面卡通，不写实，不做复杂渲染\n\n【叙事风格】\n讽刺、幽默、日常对话驱动剧情\n\n【分镜与漫画结构】\n分镜规整，生活喜剧节奏，注重对白与表情"
    }
];

export const InputStep: React.FC<InputProps> = ({
    mainTopic,
    setMainTopic,
    styleInput,
    setStyleInput,
    contentInput,
    setContentInput,

    referenceImages,
    setReferenceImages,
    selectedTemplate,
    setSelectedTemplate,
    outputLanguage,
    setOutputLanguage,
    aspectRatio,
    setAspectRatio,
    imageSize,
    setImageSize,
    onNext,
    isProcessing,
    hasGeneratedConcepts = false,
    onViewExisting
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
    const styleTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
    const [isCustomLang, setIsCustomLang] = useState(false);
    const [isAutoFilling, setIsAutoFilling] = useState(false);

    // Auto-resize textarea logic
    const adjustHeight = (ref: React.RefObject<HTMLTextAreaElement>, minHeight: number) => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = `${Math.max(ref.current.scrollHeight, minHeight)}px`;
        }
    };

    useEffect(() => {
        adjustHeight(contentTextareaRef, 120);
    }, [contentInput, selectedTemplate]);

    useEffect(() => {
        adjustHeight(styleTextareaRef, 80);
    }, [styleInput, selectedTemplate]);

    // Simulation of analysis steps
    useEffect(() => {
        if (isProcessing) {
            setAnalysisStepIndex(0);
            const interval = setInterval(() => {
                setAnalysisStepIndex(prev => {
                    if (prev < ANALYSIS_STEPS.length - 1) return prev + 1;
                    return prev;
                });
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [isProcessing]);

    const handleFiles = async (files: FileList | null) => {
        if (!files) return;
        const newImages: ReferenceImage[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) continue;

            try {
                const base64 = await fileToGenerativePart(file);
                newImages.push({
                    id: crypto.randomUUID(),
                    file,
                    mimeType: file.type,
                    previewUrl: URL.createObjectURL(file),
                    base64,
                    isMaterial: true,
                    isStyle: true
                });
            } catch (e) {
                console.error("Error processing file", file.name, e);
            }
        }
        setReferenceImages(prev => [...prev, ...newImages]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const removeImage = (id: string) => {
        setReferenceImages(prev => prev.filter(img => img.id !== id));
    };

    const toggleTag = (id: string, tag: 'isMaterial' | 'isStyle') => {
        setReferenceImages(prev => prev.map(img => {
            if (img.id === id) {
                return { ...img, [tag]: !img[tag] };
            }
            return img;
        }));
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === "Custom") {
            setIsCustomLang(true);
            setOutputLanguage("");
        } else {
            setIsCustomLang(false);
            setOutputLanguage(val);
        }
    };

    const handleTemplateSelect = (template: TemplateType) => {
        setSelectedTemplate(template);
        // Auto-set default aspect ratio based on template
        if (template === TemplateType.XIAOHONGSHU || template === TemplateType.SCIENCE_COMIC) {
            setAspectRatio("3:4");
        } else if (template === TemplateType.PPT) {
            setAspectRatio("16:9");
        }
    };

    const handleAutoFill = async () => {
        if (!mainTopic.trim() && referenceImages.length === 0) {
            alert("Please enter a Topic or upload an image first.");
            return;
        }

        setIsAutoFilling(true);
        try {
            const result = await generateInputSuggestions(mainTopic, referenceImages, selectedTemplate);
            if (result.style) setStyleInput(result.style);
            if (result.content) setContentInput(result.content);
        } catch (e) {
            console.error(e);
            alert("Failed to auto-generate suggestions.");
        } finally {
            setIsAutoFilling(false);
        }
    };

    const getPlaceholders = () => {
        switch (selectedTemplate) {
            case TemplateType.SCIENCE_COMIC:
                return {
                    topic: "e.g., Photosynthesis Process",
                    style: "e.g., Western cartoon style, thick outlines, bright colors",
                    content: "e.g., Sunlight, Water molecules, Oxygen bubbles, Chloroplast characters"
                };
            case TemplateType.PPT:
                return {
                    topic: "e.g., AI Technology Trends in 2025",
                    style: "e.g., Tech Blue, Futuristic, Clean, Minimalist",
                    content: "e.g., Introduction, LLM architecture, Agent workflows, Future outlook"
                };
            default: // Xiaohongshu
                return {
                    topic: "e.g., A minimalist home office setup",
                    style: "e.g., Warm lighting, beige tones, wooden texture, cozy atmosphere",
                    content: "e.g., Wooden desk, ceramic coffee cup, laptop, green plant"
                };
        }
    };

    const applyPresetStyle = (description: string) => {
        setStyleInput(description);
    };

    const ph = getPlaceholders();
    const CurrentIcon = ANALYSIS_STEPS[analysisStepIndex].icon;
    const themeColor = selectedTemplate === TemplateType.SCIENCE_COMIC ? 'blue' : selectedTemplate === TemplateType.PPT ? 'orange' : 'red';
    const themeGradient = selectedTemplate === TemplateType.SCIENCE_COMIC
        ? 'from-blue-500 to-indigo-600'
        : selectedTemplate === TemplateType.PPT
            ? 'from-orange-500 to-amber-600'
            : 'from-red-500 to-pink-600';

    const currentPresets = selectedTemplate === TemplateType.PPT
        ? PPT_PRESET_STYLES
        : selectedTemplate === TemplateType.SCIENCE_COMIC
            ? COMIC_PRESET_STYLES
            : selectedTemplate === TemplateType.XIAOHONGSHU
                ? XIAOHONGSHU_PRESET_STYLES
                : [];

    const isAutoFillAvailable = !isAutoFilling && (mainTopic.trim() !== "" || referenceImages.length > 0);

    return (
        <div className="flex flex-col h-full w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative animate-fade-in">
            {/* Top Accent */}
            <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${themeGradient} z-10 transition-colors duration-500`} />

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 md:p-12 max-w-4xl mx-auto w-full space-y-12">

                    {/* Header Section */}
                    <div className="text-center space-y-3">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Create Your Set</h1>
                        <p className="text-slate-500 text-lg max-w-lg mx-auto">Define your vision to generate consistent, high-quality image series.</p>
                    </div>

                    {/* 1. Style Selection Cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <button
                            onClick={() => handleTemplateSelect(TemplateType.XIAOHONGSHU)}
                            className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col gap-4 group
                        ${selectedTemplate === TemplateType.XIAOHONGSHU
                                    ? 'border-red-500 bg-red-50/30 ring-4 ring-red-500/10 shadow-lg'
                                    : 'border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedTemplate === TemplateType.XIAOHONGSHU ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-red-500'}`}>
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className={`text-lg font-bold ${selectedTemplate === TemplateType.XIAOHONGSHU ? 'text-red-900' : 'text-slate-700'}`}>Commercial</h3>
                                <p className="text-xs text-slate-500 mt-1">Product, Lifestyle, Brand Visuals.</p>
                            </div>
                            {selectedTemplate === TemplateType.XIAOHONGSHU && (
                                <div className="absolute top-4 right-4 text-red-500"><CheckCircle2 className="w-6 h-6" /></div>
                            )}
                        </button>

                        <button
                            onClick={() => handleTemplateSelect(TemplateType.PPT)}
                            className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col gap-4 group
                        ${selectedTemplate === TemplateType.PPT
                                    ? 'border-orange-500 bg-orange-50/30 ring-4 ring-orange-500/10 shadow-lg'
                                    : 'border-slate-200 hover:border-orange-200 hover:bg-slate-50'}`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedTemplate === TemplateType.PPT ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-orange-500'}`}>
                                <Presentation className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className={`text-lg font-bold ${selectedTemplate === TemplateType.PPT ? 'text-orange-900' : 'text-slate-700'}`}>PPT Slides</h3>
                                <p className="text-xs text-slate-500 mt-1">Presentation Deck, Tech, Business.</p>
                            </div>
                            {selectedTemplate === TemplateType.PPT && (
                                <div className="absolute top-4 right-4 text-orange-500"><CheckCircle2 className="w-6 h-6" /></div>
                            )}
                        </button>

                        <button
                            onClick={() => handleTemplateSelect(TemplateType.SCIENCE_COMIC)}
                            className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col gap-4 group
                        ${selectedTemplate === TemplateType.SCIENCE_COMIC
                                    ? 'border-blue-500 bg-blue-50/30 ring-4 ring-blue-500/10 shadow-lg'
                                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-blue-500'}`}>
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className={`text-lg font-bold ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'text-blue-900' : 'text-slate-700'}`}>Comic</h3>
                                <p className="text-xs text-slate-500 mt-1">Education, Storyboard, Panels.</p>
                            </div>
                            {selectedTemplate === TemplateType.SCIENCE_COMIC && (
                                <div className="absolute top-4 right-4 text-blue-500"><CheckCircle2 className="w-6 h-6" /></div>
                            )}
                        </button>
                    </div>

                    {/* 2. Topic Input Area - Optimized Vertical Layout */}
                    <div className="space-y-6">
                        {/* Header Row with Selectors */}
                        <div className="flex flex-wrap items-center justify-between gap-y-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <PenTool className={`w-4 h-4 text-${themeColor}-500`} /> Project Details
                                </h3>

                                <div className="relative">
                                    {isAutoFillAvailable && (
                                        <div className="absolute -inset-[3px] rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-breathing-glow z-0" />
                                    )}
                                    <button
                                        onClick={handleAutoFill}
                                        disabled={!isAutoFillAvailable}
                                        className={`relative z-10 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all
                                    ${!isAutoFillAvailable
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 opacity-60'
                                                : `bg-white text-${themeColor}-600 hover:text-white hover:bg-${themeColor}-500 border border-${themeColor}-200 shadow-sm`}`}
                                        title="Auto-generate Style & Content based on Topic"
                                    >
                                        {isAutoFilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                        Auto-Fill with AI
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Resolution Selector */}
                                <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-300">
                                    <Monitor className="w-3.5 h-3.5 text-slate-500" />
                                    <select
                                        value={imageSize}
                                        onChange={(e) => setImageSize(e.target.value as ImageSize)}
                                        className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer border-none p-0 focus:ring-0 appearance-none pr-1"
                                    >
                                        {IMAGE_SIZES.map(size => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Aspect Ratio Selector */}
                                <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-300">
                                    <Ratio className="w-3.5 h-3.5 text-slate-500" />
                                    <select
                                        value={aspectRatio}
                                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                        className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer border-none p-0 focus:ring-0 appearance-none pr-1"
                                    >
                                        {ASPECT_RATIOS.map(ratio => (
                                            <option key={ratio} value={ratio}>{ratio}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Language Selector */}
                                <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer group-focus-within:ring-2 border border-transparent hover:border-slate-300">
                                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                                    {isCustomLang ? (
                                        <input
                                            type="text"
                                            value={outputLanguage}
                                            onChange={(e) => setOutputLanguage(e.target.value)}
                                            placeholder="Language..."
                                            className="text-xs bg-transparent border-none outline-none w-24 text-slate-700 placeholder:text-slate-400 font-medium"
                                            autoFocus
                                        />
                                    ) : (
                                        <select
                                            value={LANGUAGES.includes(outputLanguage) ? outputLanguage : "Custom"}
                                            onChange={handleLanguageChange}
                                            className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer border-none p-0 focus:ring-0 appearance-none pr-4"
                                        >
                                            {LANGUAGES.map(lang => (
                                                <option key={lang} value={lang}>{lang}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            {/* Row 1: Topic */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Topic / Subject <span className="text-red-500">*</span></label>
                                <input
                                    value={mainTopic}
                                    onChange={(e) => setMainTopic(e.target.value)}
                                    placeholder={ph.topic}
                                    className={`w-full p-4 rounded-xl border-2 bg-slate-50 outline-none transition-all text-slate-800 placeholder:text-slate-400 font-medium text-lg
                                ${mainTopic.trim() ? 'bg-white' : ''}
                                focus:bg-white focus:border-${themeColor}-500 focus:shadow-lg focus:shadow-${themeColor}-500/5 border-slate-200`}
                                />
                            </div>

                            {/* Row 2: Content (Height 120px + Auto Expand) */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <AlignLeft className="w-3.5 h-3.5" /> Core Content / Details <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    ref={contentTextareaRef}
                                    value={contentInput}
                                    onChange={(e) => setContentInput(e.target.value)}
                                    placeholder={ph.content}
                                    className={`w-full p-4 rounded-xl border-2 bg-slate-50 outline-none transition-all resize-none text-slate-800 placeholder:text-slate-400 text-sm overflow-hidden min-h-[120px]
                                ${contentInput.trim() ? 'bg-white' : ''}
                                focus:bg-white focus:border-${themeColor}-500 focus:shadow-lg focus:shadow-${themeColor}-500/5 border-slate-200`}
                                />
                            </div>

                            {/* Row 3: Style (Height 80px + Auto Expand) */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Palette className="w-3.5 h-3.5" /> Art Style
                                </label>

                                {/* Preset Style Library (Placed above style input) */}
                                {currentPresets.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                        {currentPresets.map((preset) => (
                                            <button
                                                key={preset.title}
                                                onClick={() => applyPresetStyle(preset.description)}
                                                className={`text-[10px] px-2 py-1 rounded-md border transition-all truncate max-w-full
                                            ${styleInput === preset.description
                                                        ? `bg-${themeColor}-500 text-white border-${themeColor}-500 shadow-sm`
                                                        : `bg-white text-slate-600 border-slate-200 hover:border-${themeColor}-300 hover:bg-${themeColor}-50 Tian`}`}
                                                title={preset.title}
                                            >
                                                {preset.title}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <textarea
                                    ref={styleTextareaRef}
                                    value={styleInput}
                                    onChange={(e) => setStyleInput(e.target.value)}
                                    placeholder={ph.style}
                                    className={`w-full p-4 rounded-xl border-2 bg-slate-50 outline-none transition-all resize-none text-slate-800 placeholder:text-slate-400 text-sm overflow-hidden min-h-[80px]
                                ${styleInput.trim() ? 'bg-white' : ''}
                                focus:bg-white focus:border-${themeColor}-500 focus:shadow-lg focus:shadow-${themeColor}-500/5 border-slate-200`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Reference Upload Area */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <ImageIcon className={`w-4 h-4 text-${themeColor}-500`} /> Visual References <span className="text-slate-400 font-normal ml-1">(Optional)</span>
                        </label>

                        {/* Drag & Drop Zone */}
                        <div
                            className={`w-full rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer relative overflow-hidden group
                        ${dragActive
                                    ? `border-${themeColor}-500 bg-${themeColor}-50/50 scale-[1.01]`
                                    : `border-slate-200 bg-slate-50 hover:bg-white hover:border-${themeColor}-300`}`}
                            onDragEnter={() => setDragActive(true)}
                            onDragLeave={() => setDragActive(false)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={(e) => handleFiles(e.target.files)}
                            />

                            <div className="py-10 flex flex-col items-center justify-center gap-4 text-center">
                                <div className={`w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 group-hover:shadow-md border border-slate-100`}>
                                    <UploadCloud className={`w-8 h-8 text-${themeColor}-500`} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-700 font-bold">Click to upload or drag images here</p>
                                    <p className="text-xs text-slate-400">Supports JPG, PNG, WEBP</p>
                                </div>
                            </div>
                        </div>

                        {/* Image Grid */}
                        {referenceImages.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 pt-2">
                                {referenceImages.map((img) => (
                                    <div key={img.id} className="relative group aspect-[3/4] rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                                        <img src={img.previewUrl} alt="ref" className="w-full h-full object-cover" />

                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-1 backdrop-blur-[1px]">
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleTag(img.id, 'isMaterial'); }}
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 shadow-sm border ${img.isMaterial ? 'bg-blue-500 text-white border-blue-400' : 'bg-white/20 text-white border-white/40 hover:bg-white/40'}`}
                                                    title="Use as Subject Material"
                                                >M</button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleTag(img.id, 'isStyle'); }}
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 shadow-sm border ${img.isStyle ? 'bg-purple-500 text-white border-purple-400' : 'bg-white/20 text-white border-white/40 hover:bg-white/40'}`}
                                                    title="Use as Style Reference"
                                                >S</button>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                                className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors mt-1"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Tag Indicators (visible when not hovering) */}
                                        <div className="absolute bottom-1.5 left-1.5 flex gap-1 opacity-100 group-hover:opacity-0 transition-opacity">
                                            {img.isMaterial && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm ring-1 ring-white" />}
                                            {img.isStyle && <div className="w-2 h-2 rounded-full bg-purple-500 shadow-sm ring-1 ring-white" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-5 border-t border-slate-100 bg-white/80 backdrop-blur-md flex justify-end items-center z-20 gap-4">
                {hasGeneratedConcepts && onViewExisting && !isProcessing && (
                    <button
                        onClick={onViewExisting}
                        className="px-6 py-3.5 text-slate-600 font-bold rounded-xl transition-all hover:bg-slate-100 flex items-center gap-2"
                    >
                        View Last Concept
                    </button>
                )}

                <button
                    onClick={onNext}
                    disabled={(!mainTopic.trim() && !contentInput.trim()) || isProcessing}
                    className={`px-10 py-3.5 text-white text-base font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-3 bg-gradient-to-r ${themeGradient}`}
                >
                    {hasGeneratedConcepts ? "Regenerate Concept" : "Generate Concept"} <ArrowRight className="w-5 h-5" />
                </button>
            </div>

            {/* Analysis Loading Overlay */}
            {isProcessing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-[50] flex flex-col items-center justify-center animate-fade-in px-4">
                    <div className="w-full max-w-sm space-y-8 p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 text-center ring-4 ring-slate-50">
                        <div className={`mx-auto w-20 h-20 rounded-full bg-${themeColor}-50 flex items-center justify-center relative`}>
                            <div className={`absolute inset-0 rounded-full border-4 border-${themeColor}-100 border-t-${themeColor}-500 animate-spin`}></div>
                            <CurrentIcon className={`w-8 h-8 text-${themeColor}-500`} />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{ANALYSIS_STEPS[analysisStepIndex].label}</h2>
                            <p className="text-sm text-slate-500 font-medium">{ANALYSIS_STEPS[analysisStepIndex].sub}</p>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ease-out bg-gradient-to-r ${themeGradient}`}
                                style={{ width: `${((analysisStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};