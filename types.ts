export enum AppStep {
  INPUT = 'INPUT',
  PLANNING = 'PLANNING', // Generating the text plan
  PLAN_REVIEW = 'PLAN_REVIEW', // User reviews/edits plan
  GENERATING = 'GENERATING', // Generating actual images
  EDITOR = 'EDITOR', // Final review and edit
  EXPORT = 'EXPORT'
}

export enum TemplateType {
  XIAOHONGSHU = 'XIAOHONGSHU',
  SCIENCE_COMIC = 'SCIENCE_COMIC'
}

export interface ReferenceImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  isMaterial: boolean; // New: Use as subject/content source
  isStyle: boolean;    // New: Use as visual style/lighting source
}

export interface ImagePlanItem {
  id: string;
  order: number;
  role: string; // e.g., Cover, Detail, CTA, or Page 1, Page 2
  description: string; // The creative prompt / Panel breakdown
  composition: string;
  copywriting?: string; // Suggested text / Dialogues
  layoutSuggestion?: string; // New: Typography and layout details
  inheritanceFocus: string[]; // e.g., ['Color', 'Mood']
}

export interface GeneratedImage {
  id: string; // Matches plan item id
  planItem: ImagePlanItem;
  imageUrl: string; // Base64 data URL
  base64Data: string; // Raw base64 data for re-sending to API
  status: 'pending' | 'generating' | 'completed' | 'failed';
  editHistory: string[]; // Prompts used to reach this state
}

export interface PlanAnalysis {
  keywords: string[];
  contentDirection: string;
  styleAnalysis: string;
  bestReferenceId?: string; // ID of the reference image chosen as "Main Style Source"
}

export interface GenerationState {
  currentImageIndex: number;
  isPaused: boolean;
}

export interface Window {
  aistudio?: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}