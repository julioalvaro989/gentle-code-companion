import { exerciseCatalog } from "./exerciseCatalog";

export type AnimationStatus = "available" | "pending" | "review" | "error";
export type AnimationVerification = {
  exerciseId: string;
  status: AnimationStatus;
  modelUrl: string | null;
  animationName: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  license: string | null;
  licenseUrl: string | null;
  verifiedAt: string | null;
  compatibility: {
    movement: string;
    equipment: string;
    variation: string;
    bodyPosition: string;
  };
  reviewNote?: string;
};

/**
 * Empty-on-purpose manifest: no 3D asset has been licensed, imported, or
 * verified in this repository yet. Never put a URL here until the exact
 * movement, equipment variant, license and playback have been reviewed.
 */
export const exerciseAnimationRegistry: Record<string, AnimationVerification> =
  Object.fromEntries(exerciseCatalog.map(exercise => [exercise.id, {
    exerciseId: exercise.id,
    status: "pending" as const,
    modelUrl: null,
    animationName: null,
    sourceName: null,
    sourceUrl: null,
    license: null,
    licenseUrl: null,
    verifiedAt: null,
    compatibility: {
      movement: exercise.name,
      equipment: exercise.equipment,
      variation: exercise.alternativeName,
      bodyPosition: "Needs curator verification"
    }
  }]));

/** Idempotent audit helper: matches only stable exercise IDs, never names. */
export function reconcileAnimationCandidates(candidates: AnimationVerification[]) {
  const knownIds = new Set(exerciseCatalog.map(exercise => exercise.id));
  const accepted: AnimationVerification[] = [];
  const needsReview: AnimationVerification[] = [];
  const unknown: AnimationVerification[] = [];
  for (const candidate of candidates) {
    if (!knownIds.has(candidate.exerciseId)) {
      unknown.push(candidate);
      continue;
    }
    const hasSource = Boolean(candidate.sourceName && candidate.sourceUrl && candidate.license && candidate.licenseUrl);
    const hasModel = Boolean(candidate.modelUrl && candidate.animationName);
    if (candidate.status === "available" && hasSource && hasModel && candidate.verifiedAt) {
      accepted.push(candidate);
    } else if (candidate.status === "review" || (candidate.modelUrl && !candidate.verifiedAt)) {
      needsReview.push({ ...candidate, status: "review" });
    }
  }
  return { accepted, needsReview, unknown };
}
