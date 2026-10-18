import { exerciseCatalog, type ExerciseRecord } from "../components/exerciseCatalog";

export type WorkoutGoal = "strength" | "muscle" | "weight-loss" | "general";
export type WorkoutProfile = {
  primaryGoal?: string | null;
  experienceLevel?: string | null;
  weeklyFrequency?: number | null;
  trainingLocation?: string | null;
  sessionMinutes?: number | null;
  equipment?: string[] | null;
  preferences?: string | null;
  physicalLimitations?: string | null;
};
export type PlannedExercise = {
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  instructions: string[];
  sets: number;
  reps: string;
  restSeconds: number;
  snapshot: { name: string; primaryMuscle: string; equipment: string; instructions: string[] };
};
export type PlannedDay = {
  date: string;
  status: "planned" | "rest";
  title: string;
  muscleGroups: string[];
  estimatedMinutes: number;
  exercises: PlannedExercise[];
};
export type WeeklyWorkoutPlan = {
  weekStart: string;
  profileSnapshot: WorkoutProfile;
  generatedAt: string;
  days: PlannedDay[];
};

const dayMs = 86_400_000;
const normalize = (value: string | null | undefined) => (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const parseEquipment = (value: string) => value.split(/[;,]/).map(item => normalize(item.trim())).filter(Boolean);

export function getLocalDateKey(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
export function getMonday(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}
function locationMatches(exercise: ExerciseRecord, location: string): boolean {
  const requested = normalize(location);
  if (!requested) return true;
  if (requested.includes("casa") || requested.includes("home")) return exercise.location !== "Academia";
  if (requested.includes("academia") || requested.includes("gym")) return true;
  return true;
}
function equipmentMatches(exercise: ExerciseRecord, available: string[]): boolean {
  const requirements = parseEquipment(exercise.equipment);
  if (!available.length) return requirements.every(item => item.includes("peso corporal") || item === "parede" || item === "banco ou apoio firme");
  return requirements.every(requirement => {
    if (requirement.includes("peso corporal") || requirement === "parede") return true;
    return available.some(item => item === requirement || item.includes(requirement) || requirement.includes(item));
  });
}
function levelMatches(exercise: ExerciseRecord, level: string): boolean {
  const requested = normalize(level);
  if (requested.includes("iniciante")) return exercise.difficulty === "Iniciante";
  if (requested.includes("intermedi")) return exercise.difficulty !== "Avançado";
  return true;
}
function safeForProfile(exercise: ExerciseRecord, limitations: string): boolean {
  // Do not pretend free-text limitations can be clinically interpreted.
  // For non-empty restrictions, only keep low-impact mobility/bodyweight options
  // and ask the UI to surface professional guidance rather than infer a diagnosis.
  if (!limitations.trim()) return true;
  const muscle = normalize(exercise.primaryMuscle);
  const name = normalize(exercise.name);
  return ["mobilidade", "alongamento"].some(term => muscle.includes(term) || name.includes(term));
}
function goalMuscles(goal: string): string[][] {
  const normalized = normalize(goal);
  if (/hipertrof|massa|musculo/.test(normalized)) return [["Peito", "Costas", "Ombros"], ["Quadriceps", "Posteriores de coxa", "Gluteos"], ["Biceps", "Triceps", "Core"]];
  if (/emagrec|perda de peso|condicionamento/.test(normalized)) return [["Cardio", "Corpo inteiro"], ["Quadriceps", "Gluteos", "Core"], ["Costas", "Peito", "Cardio"]];
  if (/forca/.test(normalized)) return [["Quadriceps", "Posteriores de coxa"], ["Peito", "Costas"], ["Gluteos", "Ombros", "Core"]];
  return [["Quadriceps", "Gluteos", "Core"], ["Peito", "Costas"], ["Ombros", "Biceps", "Triceps"]];
}
function muscleMatches(primary: string, groups: string[]): boolean {
  const p = normalize(primary);
  return groups.some(group => p.includes(normalize(group)) || normalize(group).includes(p));
}
function paramsFor(profile: WorkoutProfile) {
  const level = normalize(profile.experienceLevel);
  if (level.includes("avanc")) return { sets: 3, reps: "6–10", restSeconds: 120 };
  if (level.includes("intermedi")) return { sets: 3, reps: "8–12", restSeconds: 90 };
  return { sets: 2, reps: "8–12", restSeconds: 90 };
}
export function generateWeeklyWorkoutPlan(profile: WorkoutProfile, startDate: Date, now = new Date()): WeeklyWorkoutPlan {
  const daysAvailable = Math.max(1, Math.min(6, Math.round(profile.weeklyFrequency ?? 3)));
  const sessionMinutes = Math.max(15, Math.min(180, Math.round(profile.sessionMinutes ?? 35)));
  const limitations = profile.physicalLimitations?.trim() ?? "";
  const availableEquipment = profile.equipment?.map(String) ?? [];
  const base = getMonday(startDate);
  const split = goalMuscles(profile.primaryGoal ?? "");
  const sessionsPerWeek = Math.min(daysAvailable, 4);
  const chosenWeekdays = sessionsPerWeek === 1 ? [2] : sessionsPerWeek === 2 ? [1, 4] : sessionsPerWeek === 3 ? [0, 2, 4] : sessionsPerWeek === 4 ? [0, 1, 3, 5] : [0, 1, 2, 4, 5, 6];
  const days: PlannedDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base.getTime() + index * dayMs);
    const dateKey = getLocalDateKey(date);
    if (!chosenWeekdays.includes(index)) return { date: dateKey, status: "rest", title: "Descanso e recuperação", muscleGroups: [], estimatedMinutes: 0, exercises: [] };
    const focus = split[chosenWeekdays.indexOf(index) % split.length] ?? split[0] ?? ["Corpo inteiro"];
    const eligible = exerciseCatalog.filter(exercise =>
      locationMatches(exercise, profile.trainingLocation ?? "") &&
      equipmentMatches(exercise, availableEquipment) &&
      levelMatches(exercise, profile.experienceLevel ?? "") &&
      safeForProfile(exercise, limitations) &&
      exercise.difficulty !== "Avançado" &&
      !/alongamento|mobilidade/.test(normalize(exercise.primaryMuscle)) &&
      muscleMatches(exercise.primaryMuscle + " " + exercise.secondaryMuscles.join(" "), focus.join(" "))
    );
    const unique = eligible.filter((exercise, i, all) => all.findIndex(other => other.id === exercise.id) === i);
    const count = Math.max(2, Math.min(6, Math.floor(sessionMinutes / 7)));
    const selected = unique.slice(0, count);
    const params = paramsFor(profile);
    const exercises: PlannedExercise[] = selected.map(exercise => ({
      exerciseId: exercise.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      equipment: exercise.equipment,
      instructions: exercise.instructions,
      ...params,
      snapshot: { name: exercise.name, primaryMuscle: exercise.primaryMuscle, equipment: exercise.equipment, instructions: [...exercise.instructions] },
    }));
    return {
      date: dateKey,
      status: exercises.length ? "planned" : "rest",
      title: exercises.length ? "Treino " + (index + 1) : "Recuperação",
      muscleGroups: [...new Set(exercises.map(item => item.primaryMuscle))],
      estimatedMinutes: exercises.length ? Math.min(sessionMinutes, exercises.length * 6 + exercises.reduce((sum, item) => sum + item.sets * item.restSeconds / 60, 0)) : 0,
      exercises,
    };
  });
  return { weekStart: getLocalDateKey(base), profileSnapshot: { ...profile }, generatedAt: now.toISOString(), days };
}
export function isPlanProfileComplete(profile: WorkoutProfile): boolean {
  return Boolean(profile.primaryGoal && profile.experienceLevel && profile.weeklyFrequency && profile.trainingLocation);
}
