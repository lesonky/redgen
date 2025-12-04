import { PlanAnalysis, ReferenceImage } from "../types";

// --- Internal State Cache for editing ---
let LAST_REFERENCE_IMAGES: ReferenceImage[] = [];
let LAST_ANALYSIS: PlanAnalysis | undefined;

export const setLastReferenceImages = (images: ReferenceImage[]) => {
  LAST_REFERENCE_IMAGES = images;
};

export const getLastReferenceImages = () => {
  return LAST_REFERENCE_IMAGES;
};

export const setLastAnalysis = (analysis: PlanAnalysis) => {
  LAST_ANALYSIS = analysis;
};

export const getLastAnalysis = () => {
  return LAST_ANALYSIS;
};
