import { createFileRoute } from "@tanstack/react-router";
import { ExerciseLibrary } from "../components/ExerciseLibrary";
import { ExerciseDemoModal } from "../components/ExerciseDemoModal";
import { PublicLanding } from "../components/PublicLanding";
import "../components/AuthPage.css";
import { VibraChat } from "../components/VibraChat";
import { Button } from "../components/ui/button";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type CSSProperties } from "react";
import { adoptSupabaseSession, getFitnessProfile, getFitnessProgress, getVibraAccess, requestPasswordReset, resendSignupConfirmation, saveFitnessProfile, saveFitnessProgress, getFitnessAvatarUrl, saveFitnessAvatar, signIn, signInWithGoogle, signOut, signUp, type AuthSession } from "../lib/supabase";
import { isVibraPlanId, VIBRA_PLANS, VIBRA_SELECTED_PLAN_KEY, type VibraPlanId } from "../lib/plans";
import { useLocalToday } from "../lib/date-utils";
const vibraLogoUrl = "/vibra-logo-horizontal.svg";
import { Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, ChevronRight, CirclePlay, Clock3, Dumbbell, Eye, EyeOff, HeartPulse, Home, Leaf, Menu, Settings, Sparkles, Target, TrendingUp, Trophy, UserRound, Utensils, X, Apple, MessageCircle, Plus, BookOpen, Droplets, RotateCw, BarChart3, CalendarCheck, Timer, ChevronLeft, Camera } from "lucide-react";

const publicSiteUrl = import.meta.env['VITE_PUBLIC_SITE_URL']?.replace(/\/$/, "");

function getLoginErrorMessage(error: unknown): string {
  const candidate = error && typeof error === "object"
    ? error as { message?: unknown; code?: unknown; status?: unknown; name?: unknown }
    : {};
  const code = typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  const status = typeof candidate.status === "number" ? candidate.status : 0;

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Confira sua caixa de entrada.";
  }
  if (status === 429 || code.includes("rate_limit") || code.includes("too_many_requests") ||
      message.includes("too many requests") || message.includes("rate limit") ||
      message.includes("too many attempts") || message.includes("over_request_rate_limit")) {
    return "Muitas tentativas de acesso. Aguarde alguns minutos antes de tentar novamente.";
  }
  if (code === "invalid_credentials" || code === "invalid_grant" ||
      message.includes("invalid login credentials") || message.includes("invalid credentials") ||
      message.includes("invalid email or password")) {
    return "E-mail ou senha incorretos. Confira seus dados e tente novamente.";
  }
  if (candidate.name === "AuthRetryableFetchError" || message.includes("failed to fetch") ||
      message.includes("fetch failed") || message.includes("network request failed") ||
      message.includes("networkerror") || message.includes("load failed") ||
      (typeof navigator !== "undefined" && !navigator.onLine)) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }
  return "Não foi possível entrar agora. Tente novamente em alguns instantes.";
}

const progressInspirations = [
  { category: "CONSISTÊNCIA", text: "Cada treino é uma escolha a favor da pessoa que você quer se tornar." },
  { category: "DISCIPLINA", text: "Você não precisa ser perfeito. Precisa continuar." },
  { category: "CONSISTÊNCIA", text: "O progresso acontece quando a consistência vence a desculpa." },
  { category: "EQUILÍBRIO", text: "Respeite seu ritmo, mantenha seu compromisso e continue evoluindo." },
  { category: "SUPERAÇÃO", text: "Hoje é uma nova oportunidade para superar seus próprios limites." },
  { category: "EVOLUÇÃO", text: "Pequenos passos repetidos constroem grandes transformações." },
  { category: "DISCIPLINA", text: "A disciplina de hoje constrói a confiança de amanhã." },
  { category: "EQUILÍBRIO", text: "Não subestime o poder de continuar, mesmo nos dias difíceis." },
  { category: "EVOLUÇÃO", text: "Sua evolução não precisa ser rápida. Precisa ser sua." },
  { category: "PROPÓSITO", text: "Treine com propósito. Descanse com inteligência. Evolua com consistência." },
  { category: "ROTINA", text: "A melhor rotina é aquela que você consegue manter." },
];


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vibra | Fitness com inteligência artificial para sua rotina" },
      { name: "description", content: "Organize treinos, hábitos e objetivos com o Vibra. Consulte exercícios, acompanhe seus registros e converse com a Vibra AI dentro da sua conta." },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:site_name", content: "Vibra" },
      { property: "og:title", content: "Vibra | Seu próximo nível começa com inteligência" },
      { property: "og:description", content: "Treinos, hábitos e acompanhamento da rotina em um só lugar, com a Vibra AI como apoio." },
      { property: "og:type", content: "website" },
      ...(publicSiteUrl ? [{ property: "og:url", content: publicSiteUrl }, { name: "twitter:url", content: publicSiteUrl }] : []),
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Vibra | Seu próximo nível começa com inteligência" },
      { name: "twitter:description", content: "Organize treinos, hábitos e objetivos com a Vibra." },
    ],
    links: publicSiteUrl ? [{ rel: "canonical", href: publicSiteUrl }] : [],
  }),
  component: GymApp,
});

const authInputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #29233F", borderRadius: 14, background: "#0B0C16", color: "#F8F9FF", padding: "15px 16px", outline: "none", fontSize: 14 };

const navItems = [
  { name: "Visão geral", icon: Home },
  { name: "Calendário", icon: CalendarDays },
  { name: "Treinos", icon: Dumbbell },
  { name: "IA Fitness", icon: Sparkles },
  { name: "Progresso", icon: TrendingUp },
  { name: "Nutrição", icon: Leaf },
  { name: "Comunidade", icon: MessageCircle },
  { name: "Biblioteca de Exercícios", icon: BookOpen },
  { name: "Especialistas", icon: HeartPulse },
  { name: "Meu perfil", icon: UserRound },
];
function GymApp() {
  const localToday = useLocalToday();
  const formattedToday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(localToday);
  const dateLabel = formattedToday.charAt(0).toLocaleUpperCase("pt-BR") + formattedToday.slice(1);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<VibraPlanId | null>(null);
  const [profileName, setProfileName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{type:"success"|"error";text:string}|null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [showAuth, setShowAuth] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [progressHydrated, setProgressHydrated] = useState(false);
  const [activeNav, setActiveNav] = useState("Visão geral");
  const [inspirationIndex, setInspirationIndex] = useState(() => Math.floor(Math.random() * progressInspirations.length));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(localToday.getFullYear(), localToday.getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date(localToday.getFullYear(), localToday.getMonth(), localToday.getDate()));
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [demoExercise, setDemoExercise] = useState<{id:string;name:string} | null>(null);
  const [goal, setGoal] = useState("");
  const [water, setWater] = useState(0);

  const cancelAvatarSelection = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarFile(null);
    setAvatarMessage(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleAvatarSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarFile(null);
    setAvatarMessage(null);
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMessage({type:"error",text:"A imagem original deve ter no máximo 5 MB."});
      input.value = "";
      return;
    }
    try {
      const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47 && header[4] === 0x0d && header[5] === 0x0a && header[6] === 0x1a && header[7] === 0x0a;
      const isWebp = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
      const detectedType = isJpeg ? "image/jpeg" : isPng ? "image/png" : isWebp ? "image/webp" : "";
      if (!detectedType || (file.type && file.type !== detectedType)) {
        setAvatarMessage({type:"error",text:"Formato inválido. Selecione uma imagem JPEG, PNG ou WebP válida."});
        input.value = "";
        return;
      }
      const bitmap = await createImageBitmap(file);
      if (bitmap.width < 1 || bitmap.height < 1 || bitmap.width > 12000 || bitmap.height > 12000 || bitmap.width * bitmap.height > 40000000) {
        bitmap.close();
        setAvatarMessage({type:"error",text:"A resolução desta imagem é muito alta para ser processada com segurança."});
        input.value = "";
        return;
      }
      const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        throw new Error("Não foi possível preparar a imagem neste dispositivo.");
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const toWebp = (quality: number) => new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Não foi possível comprimir esta imagem.")), "image/webp", quality);
      });
      let blob = await toWebp(0.88);
      for (const quality of [0.8, 0.72, 0.64, 0.56]) {
        if (blob.size <= 1024 * 1024) break;
        blob = await toWebp(quality);
      }
      if (blob.size > 1024 * 1024) {
        setAvatarMessage({type:"error",text:"Não foi possível otimizar a imagem para menos de 1 MB. Escolha outra imagem."});
        input.value = "";
        return;
      }
      const optimized = new File([blob], "avatar.webp", {type:"image/webp",lastModified:Date.now()});
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(optimized);
      setAvatarPreview(URL.createObjectURL(optimized));
      setAvatarMessage(null);
    } catch {
      setAvatarMessage({type:"error",text:"Não foi possível abrir esta imagem. O arquivo pode estar corrompido ou não ser compatível."});
      input.value = "";
    }
  };

  const saveAvatarSelection = async () => {
    if (!session || !avatarFile || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarMessage(null);
    try {
      const nextUrl = await saveFitnessAvatar(session, avatarFile);
      setAvatarUrl(nextUrl);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      setAvatarMessage({type:"success",text:"Sua foto de perfil foi salva com sucesso."});
    } catch (error) {
      const message = typeof navigator !== "undefined" && !navigator.onLine ? "Sem conexão com a internet. Verifique sua conexão e tente novamente." : error instanceof Error ? error.message : "";
      setAvatarMessage({type:"error",text:message || "Não foi possível salvar a foto. Tente novamente."});
    } finally {
      setAvatarBusy(false);
    }
  };

  const changePage = (page: string) => {
    setActiveNav((current) => {
      if (current !== page) setNavHistory((history) => [...history, current]);
      return page;
    });
    setMobileMenu(false);
  };
  useEffect(() => {
    if (activeNav !== "Calendário" && activeNav !== "Progresso") return;
    setInspirationIndex(current => {
      if (progressInspirations.length < 2) return current;
      let next = Math.floor(Math.random() * progressInspirations.length);
      while (next === current) next = Math.floor(Math.random() * progressInspirations.length);
      return next;
    });
  }, [activeNav]);
  const goBack = () => {
    setNavHistory((history) => {
      if (history.length === 0) {
        setActiveNav("Visão geral");
        return [];
      }
      const previous = history[history.length - 1];
      if (previous) setActiveNav(previous);
      return history.slice(0, -1);
    });
    setMobileMenu(false);
  };
  const closePage = () => {
    setActiveNav("Visão geral");
    setNavHistory([]);
    setMobileMenu(false);
  };
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Bom dia" : greetingHour < 18 ? "Boa tarde" : "Boa noite";
  const calendarDays = Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }, (_, index) => index + 1);
  const calendarOffset = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(calendarMonth);
  const selectedDayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(selectedCalendarDate);
  const changeCalendarMonth = (delta: number) => {
    setCalendarMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  useEffect(() => {
    let forceLoginForm = false;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      // A return-to-public-landing navigation must not be redirected back to
      // checkout merely because this browser still has a pending session.
      if (params.get("public") === "1") {
        setAuthReady(true);
        setAccessReady(true);
        return;
      }
      const requestedAuth = params.get("auth");
      forceLoginForm = requestedAuth === "login";
      if (requestedAuth === "login" || requestedAuth === "signup") {
        setAuthMode(requestedAuth);
        setShowAuth(true);
        setAuthError("");
        setAuthMessage("");
      }
      const fromUrl = params.get("plan");
      let fromStorage: string | null = null;
      try { fromStorage = window.localStorage.getItem(VIBRA_SELECTED_PLAN_KEY); } catch { /* URL parameter remains available. */ }
      const chosen = isVibraPlanId(fromUrl) ? fromUrl : isVibraPlanId(fromStorage) ? fromStorage : null;
      if (chosen) {
        setSelectedPlan(chosen);
        try { window.localStorage.setItem(VIBRA_SELECTED_PLAN_KEY, chosen); } catch { /* Selection remains in component state. */ }
      }
    }
    let active = true;
    (async () => {
      try {
        const current = await adoptSupabaseSession();
        if (!active) return;
        // When the visitor explicitly chooses “Já tenho conta”, keep the
        // email/password form visible even if this browser has a stale saved
        // session. Otherwise the automatic subscription check can redirect to
        // /plans before the user gets a chance to sign in with the intended account.
        if (current && forceLoginForm) {
          setProgressHydrated(false);
          setAccessReady(true);
          return;
        }
        if (current) {
          setSession(current);
          const name = current.user.user_metadata?.full_name || current.user.email?.split("@")[0] || "Aluno Vibra";
          setProfileName(name);
          // Resolve backend authorization first. Admin sessions must be registered
          // before RLS-protected profile/progress reads are attempted.
          let access: Awaited<ReturnType<typeof getVibraAccess>>;
          try {
            access = await getVibraAccess(current);
            setAccessError("");
          } catch (error) {
            // Log technical diagnostics without session tokens, user email, or credentials.
            console.error("[Vibra access] initial authorization failed", {
              errorName: error instanceof Error ? error.name : "UnknownError",
              message: error instanceof Error ? error.message : String(error),
              userId: current.user.id,
              stage: "getVibraAccess",
              timestamp: new Date().toISOString(),
            });
            setAccessError("Não foi possível confirmar suas permissões agora. Verifique a conexão e tente validar novamente.");
            setAccessReady(true);
            return;
          }
          const profile = await getFitnessProfile(current).catch(() => null);
          if (profile?.username) setProfileName(profile.username);
          if (profile?.avatar_path) {
            setAvatarLoading(true);
            try { setAvatarUrl(await getFitnessAvatarUrl(current, profile.avatar_path)); }
            catch { setAvatarUrl(null); setAvatarMessage({type:"error",text:"Não foi possível carregar sua foto atual. Verifique a conexão e tente novamente."}); }
            finally { setAvatarLoading(false); }
          } else {
            setAvatarUrl(null);
          }
          if (profile?.goal) setGoal(profile.goal);
          const saved = await getFitnessProgress(current).catch(() => null);
          if (saved) {
            setDone(saved.completed_exercises || []);
            setWater(saved.water_glasses ?? 0);
            setGoal(saved.goal || profile?.goal || "");
          }
          const params = new URLSearchParams(window.location.search);
          const fromUrl = params.get("plan");
          let fromStorage: string | null = null;
          try { fromStorage = window.localStorage.getItem(VIBRA_SELECTED_PLAN_KEY); } catch { /* Ignore unavailable storage. */ }
          const chosenPlan = isVibraPlanId(fromUrl) ? fromUrl : isVibraPlanId(fromStorage) ? fromStorage : null;
          if (access.adminSessionLimit) {
            setAccessError("As três sessões administrativas permitidas já estão em uso. Encerre uma sessão anterior e tente novamente.");
            setAccessReady(true);
            return;
          }
          if (access.status !== "active") {
            const nextPlan = access.planId || chosenPlan;
            window.location.replace(access.status === "pending" || nextPlan ? "/checkout" + (nextPlan ? "?plan=" + nextPlan : "") : "/plans");
            return;
          }
          if (!access.profileCompleted) {
            window.location.replace("/fitness-profile");
            return;
          }
          setProgressHydrated(true);
          setAccessReady(true);
        } else {
          setProgressHydrated(false);
          setAccessReady(true);
        }
      } catch { setSession(null); setProgressHydrated(false); setAccessReady(true); }
      finally { if (active) setAuthReady(true); }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session || !progressHydrated) return;
    const timer = window.setTimeout(() => {
      saveFitnessProgress(session, { completed_exercises: done, water_glasses: water, goal }).catch(() => {});
      if (goal.trim()) saveFitnessProfile(session, { username: profileName || "Aluno Vibra", email: session.user.email || "", goal }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [session, progressHydrated, done, water, goal, profileName]);

  async function submitAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    if (authBusy) return;

    if (authMode === "login") {
      const email = authEmail.trim();
      if (!email || !authPassword) {
        setAuthError("Preencha o e-mail e a senha para continuar.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setAuthError("Informe um endereço de e-mail válido.");
        return;
      }
    }

    setAuthBusy(true);
    try {
      let next: AuthSession | null;
      if (authMode === "signup") {
        next = await signUp(authUsername.trim(), authEmail.trim(), authPassword);
        if (!next) {
          setAuthMessage("A conta foi recebida, mas o provedor de autenticação não retornou uma sessão. Para entrar sem confirmação por e-mail, desative “Confirm email” nas configurações de autenticação do projeto e tente novamente.");
          return;
        }
        setProfileName(authUsername.trim());
      } else {
        next = await signIn(authEmail.trim(), authPassword);
        setProfileName(next.user.user_metadata?.full_name || next.user.email?.split("@")[0] || "Aluno Vibra");
        const p = await getFitnessProfile(next).catch(() => null);
        if (p?.username) setProfileName(p.username);
      }
      setSession(next); setProgressHydrated(false);
      const saved = await getFitnessProgress(next).catch(() => null);
      if (saved) { setDone(saved.completed_exercises || []); setWater(saved.water_glasses || 0); setGoal(saved.goal || "Ganhar massa muscular"); }
      setProgressHydrated(true);
      const access = await getVibraAccess(next);
      setAccessReady(true);
      if (access.adminSessionLimit) {
        setAccessError("As três sessões administrativas permitidas já estão em uso. Encerre uma sessão anterior e tente novamente.");
        setAccessReady(true);
        return;
      }
      if (access.status === "active") {
        window.location.assign(access.profileCompleted ? "/" : "/fitness-profile");
      } else {
        const nextPlan = access.planId || selectedPlan;
        window.location.assign(access.status === "pending" || nextPlan ? "/checkout" + (nextPlan ? "?plan=" + nextPlan : "") : "/plans");
      }
    } catch (e) {
      setAccessReady(true);
      setAccessError("Não foi possível validar o acesso. Entre novamente para continuar.");
      setAuthError(authMode === "login"
        ? getLoginErrorMessage(e)
        : "Não foi possível concluir o cadastro agora. Confira os dados e tente novamente.");
    } finally { setAuthBusy(false); }
  }

  async function submitPasswordRecovery(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    const email = resetEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError("Informe um endereço de e-mail válido.");
      return;
    }
    setResetBusy(true);
    try {
      await requestPasswordReset(email);
      setAuthMessage("Se houver uma conta associada a esse e-mail, você receberá instruções para redefinir sua senha.");
    } catch {
      // Do not show provider details or disclose whether the address has an account.
      setAuthError("Não foi possível processar a solicitação agora. Tente novamente em alguns minutos.");
    } finally {
      setResetBusy(false);
    }
  }

  async function resendConfirmationEmail() {
    if (!authEmail.trim()) {
      setAuthError("Informe o e-mail usado no cadastro para reenviar a confirmação.");
      return;
    }
    setAuthError("");
    setResendBusy(true);
    try {
      await resendSignupConfirmation(authEmail.trim());
      setAuthMessage("Solicitação enviada. Confira a caixa de entrada e o spam; se a mensagem não chegar, aguarde alguns minutos antes de tentar novamente.");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Não foi possível reenviar o e-mail. Confira o endereço e tente novamente.");
    } finally {
      setResendBusy(false);
    }
  }

  async function googleAuth() {
    setAuthError(""); setAuthMessage(""); setAuthBusy(true);
    try {
      const next = await signInWithGoogle();
      if (next) {
        setSession(next);
        const name = next.user.user_metadata?.full_name || next.user.email?.split("@")[0] || "Aluno Vibra";
        setProfileName(name);
        const saved = await getFitnessProgress(next).catch(() => null);
        if (saved) { setDone(saved.completed_exercises || []); setWater(saved.water_glasses || 0); setGoal(saved.goal || "Ganhar massa muscular"); }
        setProgressHydrated(true);
        const access = await getVibraAccess(next);
        setAccessReady(true);
        if (access.adminSessionLimit) {
          setAccessError("As três sessões administrativas permitidas já estão em uso. Encerre uma sessão anterior e tente novamente.");
          setAccessReady(true);
          return;
        }
        if (access.status === "active") window.location.assign(access.profileCompleted ? "/" : "/fitness-profile");
        else {
          const nextPlan = access.planId || selectedPlan;
          window.location.assign(access.status === "pending" || nextPlan ? "/checkout" + (nextPlan ? "?plan=" + nextPlan : "") : "/plans");
        }
      }
    } catch (e) { setAccessReady(true); setAccessError(e instanceof Error ? e.message : "Não foi possível validar o acesso."); setAuthError(e instanceof Error ? e.message : "Não foi possível entrar com Google."); }
    finally { setAuthBusy(false); }
  }

  if (!authReady || (session && !accessReady && !accessError)) return <div style={{minHeight:"100vh",background:"#05060B",display:"grid",placeItems:"center",color:"white"}}>Carregando seu espaço Vibra...</div>;
  if (session && accessError) return <main role="alert" style={{minHeight:"100vh",background:"#05060B",display:"grid",placeItems:"center",padding:24,color:"white"}}><section style={{maxWidth:480,textAlign:"center"}}><h1>{accessError.startsWith("As três sessões") ? "Limite de sessões administrativas" : "Não foi possível validar o acesso"}</h1><p>{accessError}</p><button type="button" disabled={authBusy} onClick={async () => {
    setAuthBusy(true); setAccessError(""); setAccessReady(false);
    try {
      const current = await adoptSupabaseSession();
      if (!current) { setSession(null); setAuthMode("login"); setShowAuth(true); setAuthError("Sua sessão expirou. Entre novamente."); return; }
      setSession(current);
      const access = await getVibraAccess(current);
      if (access.adminSessionLimit) { setAccessError("As três sessões administrativas permitidas já estão em uso. Encerre uma sessão anterior e tente novamente."); return; }
      if (access.status === "active") { window.location.assign(access.profileCompleted ? "/" : "/fitness-profile"); return; }
      const params = new URLSearchParams(window.location.search);
      const storedPlan = (() => { try { return window.localStorage.getItem(VIBRA_SELECTED_PLAN_KEY); } catch { return null; } })();
      const candidate = isVibraPlanId(params.get("plan")) ? params.get("plan") : isVibraPlanId(storedPlan) ? storedPlan : null;
      window.location.assign(access.status === "pending" || access.planId || candidate ? "/checkout" + ((access.planId || candidate) ? "?plan=" + (access.planId || candidate) : "") : "/plans");
    } catch (error) {
      console.error("[Vibra access] manual retry failed", { errorName: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : String(error), userId: session.user.id, stage: "retryAuthorization", timestamp: new Date().toISOString() });
      setAccessError("A validação continua indisponível. Tente novamente em instantes; se persistir, a equipe técnica deve verificar os logs do Supabase.");
    } finally { setAuthBusy(false); setAccessReady(true); }
  }} style={{padding:"12px 18px",borderRadius:12,cursor:authBusy ? "wait" : "pointer",opacity:authBusy ? 0.65 : 1}}>{authBusy ? "Validando acesso…" : "Tentar novamente"}</button></section></main>;
  const publicLandingRequested = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("public") === "1";
  if (publicLandingRequested) return <PublicLanding onAuth={(mode) => window.location.assign("/?auth=" + mode)} onPlans={() => window.location.assign("/plans")} />;
  if (!session && !showAuth) return <PublicLanding onAuth={(mode) => { setAuthMode(mode); setAuthError(""); setAuthMessage(""); setShowAuth(true); window.scrollTo({ top: 0, behavior: "instant" }); }} onPlans={() => window.location.assign("/plans")} />;
  if (!session) return <div className="vibra-auth-page">
    <div className="va-background va-background-purple" aria-hidden="true" />
    <div className="va-background va-background-lime" aria-hidden="true" />
    <main className="va-layout">
      <section className="va-story" aria-label="Sobre o Vibra">
        <button type="button" className="va-back" onClick={() => { setShowAuth(false); setAuthError(""); setAuthMessage(""); }}>
          <ArrowLeft size={16} /> Voltar ao início
        </button>
        <div className="va-brand"><img className="va-brand-logo va-brand-logo-lg" src={vibraLogoUrl} alt="Vibra — Fitness com IA" /></div>
        <div className="va-story-copy">
          <div className="va-eyebrow"><Sparkles size={14} /> SEU ESPAÇO DE EVOLUÇÃO</div>
          <h1>Seu ritmo.<br />Sua jornada.<br /><span>Seu próximo nível.</span></h1>
          <p>Treinos, hábitos e evolução em um só lugar. Continue construindo uma rotina que faz sentido para você.</p>
        </div>
        <div className="va-story-footer"><span><Dumbbell size={16}/> TREINO</span><i /><span><Target size={16}/> FOCO</span><i /><span><TrendingUp size={16}/> EVOLUÇÃO</span></div>
      </section>
      <section className="va-auth-panel" aria-labelledby="va-title">
        <div className="va-panel-top"><span className="va-mobile-brand"><img className="va-brand-logo" src={vibraLogoUrl} alt="Vibra — Fitness com IA" /></span><span className="va-secure"><span /> ACESSO À SUA CONTA</span></div>
        <div className="va-form-heading">
          <div className="va-form-eyebrow">{showForgotPassword ? "RECUPERAÇÃO DE ACESSO" : authMode === "signup" ? "COMECE POR AQUI" : "BEM-VINDO DE VOLTA"}</div>
          <h2 id="va-title">{showForgotPassword ? <>Recupere sua <span>conta.</span></> : authMode === "signup" ? <>Comece sua <span>evolução.</span></> : <>Bom ter você <span>de volta.</span></>}</h2>
          <p>{showForgotPassword ? "Informe seu e-mail para receber as instruções de redefinição de senha." : authMode === "signup" ? "Crie sua conta e organize os próximos passos da sua jornada." : "Entre para continuar de onde você parou."}</p>
          {authMode === "signup" && selectedPlan && <div className="va-message va-success">Plano selecionado: <strong>{VIBRA_PLANS[selectedPlan].name} · {VIBRA_PLANS[selectedPlan].priceLabel}/mês</strong>. A cobrança só libera o acesso após confirmação real.</div> }
        </div>
        <form className="va-form" onSubmit={showForgotPassword ? submitPasswordRecovery : submitAuth}>
          {showForgotPassword ? <>
            <label>E-mail cadastrado<input required type="email" autoComplete="email" placeholder="voce@exemplo.com" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} /></label>
            {authError && <div role="alert" className="va-message va-error">{authError}</div>}
            {authMessage && <div role="status" className="va-message va-success">{authMessage}</div>}
            <button disabled={resetBusy} type="submit" className="va-submit">{resetBusy ? <><span className="va-spinner" /> Enviando...</> : <>Enviar instruções <ArrowRight size={17}/></>}</button>
            <button type="button" className="va-back-link" onClick={()=>{setShowForgotPassword(false);setAuthError("");setAuthMessage("");}}>Voltar para o login</button>
          </> : <>
            {authMode === "signup" && <label>Nome de usuário<input required disabled={authBusy} minLength={2} autoComplete="username" placeholder="Como podemos chamar você?" value={authUsername} onChange={e=>setAuthUsername(e.target.value)} /></label>}
            <label>E-mail<input required disabled={authBusy} type="email" autoComplete="email" placeholder="voce@exemplo.com" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} /></label>
            <label>Senha<div className="va-password-field"><input required disabled={authBusy} minLength={6} type={showPassword ? "text" : "password"} autoComplete={authMode === "signup" ? "new-password" : "current-password"} placeholder="Mínimo de 6 caracteres" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} /><button type="button" className="va-password-toggle" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} disabled={authBusy} onClick={()=>setShowPassword(value=>!value)}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></label>
            {authMode === "login" && <div className="va-forgot-row"><button type="button" onClick={()=>{setResetEmail(authEmail);setShowForgotPassword(true);setAuthError("");setAuthMessage("");}}>Esqueci minha senha?</button></div>}
            {authError && <div role="alert" className="va-message va-error">{authError}</div>}
            {authMessage && <div role="status" className="va-message va-success">{authMessage}</div>}
            {authMessage && authMode === "signup" && <button type="button" className="va-resend" onClick={resendConfirmationEmail} disabled={resendBusy || authBusy}>{resendBusy ? "Reenviando..." : "Reenviar e-mail de confirmação"}</button>}
            <button disabled={authBusy} type="submit" className="va-submit">{authBusy ? <><span className="va-spinner" /> Aguarde...</> : authMode === "signup" ? <>Criar minha conta <ArrowRight size={17}/></> : <>Entrar na Vibra <ArrowRight size={17}/></>}</button>
          </>}
        </form>
        {!showForgotPassword && <>
          <div className="va-divider"><span/>ou continue com<span/></div>
          <button type="button" className="va-google" onClick={googleAuth} disabled={authBusy}><span className="va-google-g">G</span> Continuar com Google</button>
          <p className="va-switch">{authMode === "signup" ? "Já tem uma conta?" : "Ainda não tem conta?"}<button type="button" disabled={authBusy} onClick={()=>{setAuthMode(authMode==="signup"?"login":"signup");setAuthError("");setAuthMessage("");setShowPassword(false);}}> {authMode === "signup" ? "Entrar" : "Criar conta"}</button></p>
          <p className="va-disclaimer">Ao continuar, você concorda em usar a Vibra de forma responsável.</p>
        </>}
      </section>
    </main>
  </div>;

  if (!accessReady) return <div style={{minHeight:"100vh",background:"#05060B",display:"grid",placeItems:"center",color:"white"}}>Verificando pagamento e acesso...</div>;

  return <div className="gym-app fit-app">
    <VibraChat />
    <>{mobileMenu && <button type="button" className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}<aside className={"sidebar " + (mobileMenu ? "sidebar-open" : "")}>
      <a className="gym-logo" href="#inicio" aria-label="Vibra, início" onClick={() => changePage("Visão geral")}><img className="gym-logo-img" src={vibraLogoUrl} alt="Vibra — Fitness com IA" /></a><button type="button" className="sidebar-close" aria-label="Fechar menu lateral" onClick={() => setMobileMenu(false)}><X size={20}/></button>
      <div className="side-label">SEU ESPAÇO</div>
      <nav className="side-nav">{navItems.map(({name,icon:Icon})=><button key={name} className={"nav-item "+(activeNav===name?"active":"")} onClick={()=>changePage(name)}><Icon size={18}/>{name}</button>)}</nav>
      <div className="sidebar-bottom"><div className="coach-card"><div className="coach-icon"><HeartPulse size={20}/></div><strong>Seu próximo nível.</strong><p>Consistência hoje. Resultados amanhã.</p><button onClick={()=>changePage("Especialistas")}>Falar com especialista <ChevronRight size={15}/></button></div><button className="nav-item settings-item" onClick={()=>changePage("Configurações")}><Settings size={18}/> Configurações</button><div className="user-mini"><div className="avatar fit-avatar-mini">{avatarUrl ? <img src={avatarUrl} alt="" /> : (profileName || "V").slice(0,2).toUpperCase()}</div><div><strong>{profileName || "Aluno Vibra"}</strong><small>Área do aluno</small></div><button aria-label="Abrir perfil" onClick={()=>changePage("Meu perfil")}><ChevronRight size={17}/></button></div></div>
    </aside></>
    <main className="main-content" id="inicio">
      <header className="topbar"><button className="fit-mobile-menu icon-button" aria-label="Abrir menu" onClick={()=>setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div className="mobile-brand"><img className="mobile-brand-logo" src={vibraLogoUrl} alt="Vibra" /></div><div className="breadcrumb">Meu espaço <ChevronRight size={14}/><strong>{activeNav}</strong></div><div className="top-actions"><div className="date-chip"><CalendarDays size={16}/> {dateLabel}</div><button className="icon-button" aria-label="Notificações"><Bell size={18}/><i/></button><button className="avatar top-avatar" title="Sair da conta" onClick={async()=>{try { await signOut(); } catch { setAuthError("Não foi possível confirmar o logout remoto. A sessão local pode ter sido encerrada; confira o acesso antes de continuar."); } finally { setSession(null); setProgressHydrated(false); setAuthMode("login"); }}}>{avatarUrl ? <img src={avatarUrl} alt="Foto de perfil" /> : (profileName||"V").slice(0,2).toUpperCase()}</button></div></header>
      <div className="page-wrap">
        {activeNav !== "Visão geral" && <div className="fit-page-actions"><button className="outline-button fit-back-button" onClick={goBack} aria-label="Voltar para a tela anterior"><ArrowLeft size={17}/> Voltar</button><button type="button" className="outline-button fit-close-page" onClick={closePage} aria-label="Fechar esta página e voltar à visão geral"><X size={17}/><span>Fechar</span></button></div>}
        {activeNav==="Visão geral" && <>
          <section className="welcome-row"><div><div className="section-kicker"><span/> SUA JORNADA COMEÇA AQUI</div><h1>{greeting}, <span>{profileName || "bem-vindo à Vibra"}.</span></h1><p>{dateLabel}. Um passo de cada vez — acompanhe sua jornada com dados reais.</p></div><button className="outline-button" onClick={()=>changePage("Progresso")}><Activity size={17}/> Minha evolução</button></section>
          <section className="fit-hero">
            <img className="fit-hero-image" src="https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1600&q=85" alt="" aria-hidden="true" width={1600} height={900} loading="eager" fetchPriority="high" decoding="async"/>
            <div className="fit-hero-shade"/>
            <div className="fit-float fit-float-one"><span className="fit-float-icon"><Sparkles size={17}/></span><div><b>Seu próximo passo</b><small>feito no seu ritmo</small></div></div>
            <div className="fit-float fit-float-two"><span className="fit-pulse"/><div><b>Vibra</b><small>Treino, hábitos e evolução</small></div></div>
            <div className="hero-copy fit-hero-copy"><div className="hero-pill"><Dumbbell size={14}/> SUA ROTINA FITNESS</div><h2>Construa sua<br/><span>evolução.</span></h2><p>Consulte sua biblioteca, registre seus hábitos e personalize seu perfil para preparar uma rotina que combine com você.</p><div className="hero-meta"><span><BookOpen size={16}/> Biblioteca de exercícios</span><span><Sparkles size={16}/> Vibra AI</span></div><button className="green-button" onClick={()=>changePage("Treinos")}><CirclePlay size={18}/>Explorar treinos<ChevronRight size={17}/></button></div>
            <div className="fit-hero-caption"><Sparkles size={14}/> SEU RITMO · SUA EVOLUÇÃO</div>
          </section>
          <section className="fit-shortcuts" aria-label="Atalhos principais">
            <button type="button" className="fit-shortcut-card" onClick={()=>changePage("Treinos")}><span className="fit-shortcut-icon"><Dumbbell size={19}/></span><span><strong>Treinos</strong><small>Planejamento e exercícios</small></span><ChevronRight size={17}/></button>
            <button type="button" className="fit-shortcut-card" onClick={()=>changePage("IA Fitness")}><span className="fit-shortcut-icon"><Sparkles size={19}/></span><span><strong>Vibra AI</strong><small>Ajuda para sua rotina</small></span><ChevronRight size={17}/></button>
            <button type="button" className="fit-shortcut-card" onClick={()=>changePage("Nutrição")}><span className="fit-shortcut-icon"><Leaf size={19}/></span><span><strong>Nutrição</strong><small>Hábitos e registros</small></span><ChevronRight size={17}/></button>
            <button type="button" className="fit-shortcut-card" onClick={()=>changePage("Comunidade")}><span className="fit-shortcut-icon"><MessageCircle size={19}/></span><span><strong>Comunidade</strong><small>Novidades do recurso</small></span><ChevronRight size={17}/></button>
          </section>
          <section className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>Exercícios registrados</span><span className="stat-icon"><Dumbbell size={18}/></span></div><div className="stat-value">{done.length}</div><div className="stat-bottom"><span>Registros disponíveis na conta</span></div></article>
            <article className="stat-card"><div className="stat-top"><span>Copos registrados</span><span className="stat-icon"><Apple size={18}/></span></div><div className="stat-value">{water}<small> / 8</small></div><div className="stat-bottom"><button className="fit-inline-action" onClick={()=>setWater(Math.min(8,water+1))}><Plus size={13}/> Registrar copo</button><span>meta configurável</span></div><div className="mini-progress"><i style={{width:(water/8*100)+"%"}}/></div></article>
            <article className="stat-card"><div className="stat-top"><span>Objetivo pessoal</span><span className="stat-icon"><Target size={18}/></span></div><div className="stat-value stat-value-text">{goal || "Não definido"}</div><div className="stat-bottom"><button className="fit-inline-action" onClick={()=>changePage("Meu perfil")}>Personalizar objetivo <ChevronRight size={13}/></button></div></article>
            <article className="stat-card"><div className="stat-top"><span>Histórico semanal</span><span className="stat-icon"><TrendingUp size={18}/></span></div><div className="stat-value stat-value-text">Sem dados</div><div className="stat-bottom"><span>O histórico por data ainda não está disponível</span></div></article>
          </section>
          <section className="lower-grid">
            <article className="panel workout-panel"><div className="panel-heading"><div><div className="section-kicker">SEU PLANEJAMENTO</div><h3>Treino de hoje</h3><p>O plano individual será exibido quando estiver configurado.</p></div><button className="text-button" onClick={()=>changePage("Treinos")}>Abrir treinos <ChevronRight size={15}/></button></div><div className="fit-empty-state"><Dumbbell size={25}/><strong>Nenhum treino programado</strong><p>Explore a biblioteca de exercícios ou complete seu perfil fitness para personalizar sua rotina.</p><button className="green-button" onClick={()=>changePage("Biblioteca de Exercícios")}>Explorar exercícios <ArrowRight size={16}/></button></div></article>
            <article className="panel nutrition-teaser"><div className="panel-heading"><div><div className="section-kicker">NUTRIÇÃO E HÁBITOS</div><h3>Registro alimentar</h3><p>Seus dados aparecerão aqui quando forem registrados.</p></div><span className="nutrition-icon"><Utensils size={19}/></span></div><div className="fit-empty-state fit-empty-state-compact"><Leaf size={23}/><strong>Sem registros alimentares</strong><p>Ainda não há refeições ou valores nutricionais salvos para exibir.</p></div><button className="start-bottom" onClick={()=>changePage("Nutrição")}>Abrir nutrição <ArrowRight size={17}/></button></article>
          </section>
          <button type="button" className="panel fit-calendar-panel fit-calendar-preview" onClick={()=>changePage("Calendário")} aria-label="Abrir calendário completo"><div className="panel-heading"><div><div className="section-kicker">CALENDÁRIO</div><h3>Seu mês</h3><p>Consulte seu calendário completo.</p></div><span className="fit-calendar-month">{monthLabel}</span></div><div className="fit-calendar-grid">{["D","S","T","Q","Q","S","S"].map((day,index)=><span className="fit-calendar-weekday" key={index}>{day}</span>)}{Array.from({length:calendarOffset},(_,index)=><span className="fit-calendar-blank" key={"blank-"+index}/>)}{calendarDays.map(day=><span key={day} className={"fit-calendar-day "+(day===localToday.getDate()?"is-today":"")}>{day}</span>)}</div></button>
          <section className="fit-specialist-strip"><div className="fit-specialist-icon"><HeartPulse size={24}/></div><div><span className="section-kicker">ACOMPANHAMENTO PROFISSIONAL</span><h3>Você não precisa fazer isso sozinho.</h3><p>Encontre orientação de nutricionistas e personal trainers cadastrados.</p></div><button className="green-button" onClick={()=>changePage("Especialistas")}>Conhecer especialistas <ArrowRight size={16}/></button></section>
        </>}
        {activeNav==="Calendário" && <section className="fit-page-section fit-calendar-page">
          <div className="fit-calendar-intro"><div className="fit-calendar-title"><span className="fit-calendar-title-icon"><CalendarDays size={26}/></span><div><div className="section-kicker"><span/> CALENDÁRIO</div><h1>Seu mês em <span>movimento.</span></h1><p className="fit-page-intro">Aqui você acompanha seus treinos, descansos e toda a sua jornada. Cada dia é uma nova oportunidade de evoluir.</p></div></div>
            <section className="fit-calendar-motivation"><img src="https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200&q=85" alt="Atleta treinando em uma academia" loading="lazy"/><div className="fit-calendar-motivation-shade"/><div className="fit-calendar-motivation-copy"><div className="section-kicker"><Sparkles size={15}/> Impulso do dia</div><p className="fit-impulse-quote">{progressInspirations[inspirationIndex]?.text}</p><button type="button" className="fit-impulse-refresh" onClick={()=>setInspirationIndex(current=>{if(progressInspirations.length<2)return current;let next=Math.floor(Math.random()*progressInspirations.length);while(next===current)next=Math.floor(Math.random()*progressInspirations.length);return next;})}><RotateCw size={15}/> Nova inspiração</button></div></section>
          </div>
          <div className="fit-calendar-dashboard">
            <section className="panel fit-calendar-main-card"><div className="fit-calendar-month-head"><button className="fit-calendar-month-button" aria-label="Mês anterior" onClick={()=>changeCalendarMonth(-1)}><ChevronLeft size={19}/></button><h2>{monthLabel.charAt(0).toLocaleUpperCase("pt-BR")+monthLabel.slice(1)}</h2><button className="fit-calendar-month-button" aria-label="Próximo mês" onClick={()=>changeCalendarMonth(1)}><ArrowRight size={19}/></button></div>
              <div className="fit-calendar-full-grid">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((day,index)=><span className="fit-calendar-full-weekday" key={day+index}>{day}</span>)}{Array.from({length:calendarOffset},(_,index)=><span className="fit-calendar-full-blank" key={"blank-"+index}/>)}{calendarDays.map(day=>{const date=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),day);const isToday=date.getFullYear()===localToday.getFullYear()&&date.getMonth()===localToday.getMonth()&&day===localToday.getDate();const isSelected=date.getFullYear()===selectedCalendarDate.getFullYear()&&date.getMonth()===selectedCalendarDate.getMonth()&&day===selectedCalendarDate.getDate();const isPast=date<new Date(localToday.getFullYear(),localToday.getMonth(),localToday.getDate());return <button type="button" key={day} onClick={()=>setSelectedCalendarDate(date)} className={"fit-calendar-full-day"+(isToday?" is-today":"")+(isSelected?" is-selected":"")+(isPast?" is-past":"")} aria-pressed={isSelected} aria-label={new Intl.DateTimeFormat("pt-BR",{day:"numeric",month:"long",year:"numeric"}).format(date)}>{day}</button>;})}</div>
              <div className="fit-calendar-selected"><CalendarCheck size={17}/><div><strong>{selectedDayLabel.charAt(0).toLocaleUpperCase("pt-BR")+selectedDayLabel.slice(1)}</strong><span>Nenhum evento registrado para esta data.</span></div></div>
            </section>
            <section className="panel fit-calendar-summary"><div className="fit-calendar-panel-heading"><div><div className="section-kicker">SEU ACOMPANHAMENTO</div><h2><BarChart3 size={19}/> Resumo do mês</h2></div><button type="button" className="fit-calendar-text-link" onClick={()=>changePage("Progresso")}>Ver detalhes</button></div>
              <div className="fit-calendar-metric"><span className="fit-calendar-metric-icon"><Dumbbell size={19}/></span><div className="fit-calendar-metric-body"><small>Treinos realizados</small><strong>Sem dados registrados</strong><span>Não há treinos datados para este mês.</span></div></div>
              <div className="fit-calendar-metric"><span className="fit-calendar-metric-icon"><Droplets size={19}/></span><div className="fit-calendar-metric-body"><small>Hidratação registrada</small><strong>{water} copos registrados</strong><div className="fit-calendar-meter"><i style={{width:Math.min(100,water/8*100)+"%"}}/></div><span>Referência diária: 8 copos</span></div></div>
              <div className="fit-calendar-metric"><span className="fit-calendar-metric-icon"><Timer size={19}/></span><div className="fit-calendar-metric-body"><small>Tempo de treino</small><strong>Sem dados registrados</strong><span>A duração não está disponível.</span></div></div>
              <div className="fit-calendar-metric"><span className="fit-calendar-metric-icon"><TrendingUp size={19}/></span><div className="fit-calendar-metric-body"><small>Progresso semanal</small><strong>{done.length ? done.length+" exercícios registrados" : "Sem dados registrados"}</strong><span>Registros sem data não entram no calendário.</span></div></div>
            </section>
            <section className="panel fit-calendar-events"><div className="fit-calendar-panel-heading"><div><div className="section-kicker">SUA AGENDA</div><h2><CalendarDays size={19}/> Próximos eventos</h2></div></div><div className="fit-calendar-empty"><span><CalendarDays size={22}/></span><strong>Nenhum evento programado</strong><p>Quando houver treinos com data e horário, eles aparecerão aqui em ordem cronológica.</p><button type="button" className="green-button" onClick={()=>changePage("Treinos")}>Consultar treinos <ArrowRight size={16}/></button></div></section>
          </div>
          <section className="fit-calendar-next-step"><span className="fit-calendar-next-icon"><Target size={27}/></span><div><small>Seu próximo passo</small><h2>Organize seu próximo treino.</h2><p>Uma rotina consistente começa com um plano possível, no seu ritmo.</p></div><button type="button" className="green-button" onClick={()=>changePage("Treinos")}>Ver treinos <ArrowRight size={16}/></button><span className="fit-calendar-next-art" aria-hidden="true"/></section>
        </section>}
        {activeNav==="Treinos" && <section className="fit-page-section"><div className="section-kicker"><span/> PLANEJAMENTO DE TREINO</div><h1>Treine no seu <span>ritmo.</span></h1><p className="fit-page-intro">Os treinos programados aparecerão aqui quando houver um plano associado à sua conta. Enquanto isso, explore o catálogo disponível.</p><div className="panel fit-empty-state-panel"><div className="fit-empty-state"><Dumbbell size={28}/><strong>Nenhum treino programado para hoje</strong><p>Não há um plano individual registrado para esta data. A biblioteca contém exercícios de referência, mas não será tratada como um treino prescrito.</p><button className="green-button" onClick={()=>changePage("Biblioteca de Exercícios")}><BookOpen size={17}/> Abrir biblioteca <ArrowRight size={16}/></button></div></div></section>}
        {activeNav==="Biblioteca de Exercícios" && <ExerciseLibrary />}
        <ExerciseDemoModal exerciseId={demoExercise?.id ?? null} {...(demoExercise ? { workoutName: demoExercise.name } : {})} onClose={()=>setDemoExercise(null)} />
        {activeNav==="Nutrição" && <section className="fit-page-section"><div className="section-kicker"><span/> NUTRIÇÃO E BEM-ESTAR</div><h1>Nutrição com <span>contexto.</span></h1><p className="fit-page-intro">Esta área pode reunir registros de refeições e preferências alimentares. Nenhum registro nutricional estruturado está disponível no momento.</p><div className="fit-nutrition-layout"><article className="panel fit-food-summary"><div className="section-kicker">HÁBITO DE HIDRATAÇÃO</div><div className="fit-big-number">{water} <small>copos registrados</small></div><div className="nutrition-bar"><i style={{width:(water/8*100)+"%"}}/></div><p className="fit-page-intro">Registro salvo na conta; a data de cada registro não está disponível para confirmar um resumo diário.</p><div className="fit-water-box"><div><Apple size={19}/><strong>Hidratação</strong><small>{water} de 8 copos registrados</small></div><button className="green-button" onClick={()=>setWater(Math.min(8,water+1))} disabled={water>=8}><Plus size={16}/> Adicionar copo</button></div></article><article className="panel"><div className="panel-heading"><div><div className="section-kicker">REGISTROS ALIMENTARES</div><h3>Refeições</h3></div><Utensils size={20}/></div><div className="fit-empty-state"><Leaf size={25}/><strong>Nenhuma refeição registrada</strong><p>Quando o registro alimentar estiver conectado, suas refeições e nutrientes aparecerão aqui.</p></div></article></div><div className="fit-note"><HeartPulse size={18}/> <span>Orientações clínicas e metas nutricionais individuais devem ser definidas por profissional qualificado.</span></div></section>}
        {activeNav==="Especialistas" && <section className="fit-page-section"><div className="section-kicker"><span/> ACOMPANHAMENTO PROFISSIONAL</div><h1>Orientação com <span>confiança.</span></h1><p className="fit-page-intro">O diretório de profissionais ainda não está conectado a uma fonte verificada de perfis e disponibilidade.</p><div className="panel fit-empty-state-panel"><div className="fit-empty-state"><HeartPulse size={28}/><strong>Profissionais ainda não disponíveis</strong><p>Quando houver cadastro verificado e agenda integrada, você poderá consultar perfis e solicitar acompanhamento por aqui.</p></div></div></section>}
        {activeNav==="Progresso" && <section className="fit-page-section fit-progress-page"><div className="section-kicker"><span/> SUA EVOLUÇÃO</div><div className="fit-progress-heading"><div><h1>Sua <span>evolução.</span></h1><p className="fit-page-intro">Olá, {profileName || session?.user.user_metadata?.full_name || session?.user.email?.split("@")[0] || "atleta"}. Acompanhe os registros que já existem na sua conta.</p></div><div className="fit-progress-date"><CalendarDays size={16}/><span>{dateLabel}</span></div></div><section className="fit-impulse-card" aria-labelledby="fit-impulse-title"><div className="fit-impulse-mark"><Sparkles size={22}/></div><div className="fit-impulse-content"><div className="section-kicker" id="fit-impulse-title">IMPULSO DO DIA <span className="fit-impulse-category">{progressInspirations[inspirationIndex]?.category}</span></div><p className="fit-impulse-quote">{progressInspirations[inspirationIndex]?.text}</p><span className="fit-impulse-caption">Um passo de cada vez. No seu ritmo.</span></div></section><div className="fit-records-label"><div><div className="section-kicker">SEUS REGISTROS</div><h2>O que você já registrou</h2></div><span className="fit-records-note">Dados salvos na sua conta</span></div><div className="stats-grid fit-progress-stats"><article className="stat-card fit-progress-stat"><div className="stat-top"><span>Exercícios registrados</span><span className="stat-icon"><Dumbbell size={18}/></span></div><div className="stat-value">{done.length}</div><div className="stat-bottom"><span>{done.length ? "Exercícios na sua lista salva" : "Registre seu primeiro treino para acompanhar sua evolução."}</span></div></article><article className="stat-card fit-progress-stat"><div className="stat-top"><span>Hidratação registrada</span><span className="stat-icon"><Apple size={18}/></span></div><div className="stat-value">{water}<small> copos</small></div><div className="stat-bottom"><span>Contagem salva; não há data individual por registro.</span></div><div className="mini-progress fit-progress-water" role="progressbar" aria-label="Copos registrados em relação à referência de 8" aria-valuemin={0} aria-valuemax={8} aria-valuenow={Math.min(water,8)}><i style={{width:(Math.min(water,8)/8*100)+"%"}}/></div></article><article className="stat-card fit-progress-stat"><div className="stat-top"><span>Tempo de treino</span><span className="stat-icon"><Clock3 size={18}/></span></div><div className="stat-value stat-value-text">Sem dados</div><div className="stat-bottom"><span>A duração das sessões não é armazenada atualmente.</span></div></article><article className="stat-card fit-progress-stat"><div className="stat-top"><span>Progresso semanal</span><span className="stat-icon"><Trophy size={18}/></span></div><div className="stat-value stat-value-text">Sem dados</div><div className="stat-bottom"><span>O backend não fornece histórico datado para calcular tendências.</span></div></article></div><section className="fit-next-step"><div className="fit-next-icon"><Target size={21}/></div><div className="fit-next-copy"><div className="section-kicker">SEU PRÓXIMO PASSO</div><h2>{done.length ? "Continue sua rotina" : "Comece pelo primeiro registro"}</h2><p>{done.length ? "Consulte sua biblioteca e escolha um exercício para seguir com seu planejamento." : "Explore os exercícios disponíveis e comece a montar sua rotina no seu ritmo."}</p></div><button type="button" className="green-button" onClick={()=>changePage(done.length ? "Treinos" : "Biblioteca de Exercícios")}>{done.length ? "Ver meus treinos" : "Explorar exercícios"} <ArrowRight size={16}/></button></section><div className="panel fit-goal-panel"><div><div className="section-kicker">SEU OBJETIVO ATUAL</div><h3>{goal || "Defina seu objetivo"}</h3><p>Escolha uma meta pessoal para personalizar sua experiência.</p></div><select value={goal} onChange={e=>setGoal(e.target.value)}><option value="">Selecione um objetivo</option><option value="Ganhar massa muscular">Ganhar massa muscular</option><option value="Perder gordura">Perder gordura</option><option value="Melhorar condicionamento">Melhorar condicionamento</option><option value="Ter mais saúde e energia">Ter mais saúde e energia</option></select></div><p className="fit-progress-limit-note"><Activity size={15}/> O histórico por data e a duração dos treinos ainda não estão disponíveis no backend; por isso, gráficos de tendência e linha do tempo não são exibidos.</p></section>}
        {(activeNav==="Meu perfil"||activeNav==="Configurações") && <section className="fit-page-section"><div className="section-kicker"><span/> CONTA E PREFERÊNCIAS</div><h1>Seu espaço, <span>do seu jeito.</span></h1><p className="fit-page-intro">Gerencie suas preferências e o foco da sua jornada fitness.</p><div className="panel fit-profile-panel">
          <div className="fit-avatar-editor">
            <input ref={avatarInputRef} className="fit-avatar-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarSelection} aria-label="Selecionar foto de perfil" disabled={avatarBusy}/>
            <button type="button" className="fit-profile-avatar fit-profile-avatar-button" onClick={()=>avatarInputRef.current?.click()} aria-label="Alterar foto de perfil" disabled={avatarBusy}>
              {avatarPreview || avatarUrl ? <img src={avatarPreview || avatarUrl || ""} alt="Prévia da foto de perfil"/> : <span>{avatarLoading ? "…" : (profileName||"V").slice(0,2).toUpperCase()}</span>}
              <span className="fit-avatar-camera"><Camera size={17}/></span>
            </button>
            <button type="button" className="fit-avatar-change" onClick={()=>avatarInputRef.current?.click()} disabled={avatarBusy}><Camera size={15}/> Alterar foto</button>
            {avatarLoading && <span className="fit-avatar-help">Carregando foto atual…</span>}
          </div>
          <div className="fit-profile-info"><h3>{profileName || "Aluno Vibra"}</h3><p>{session.user.email || "Conta Vibra"}</p>
          {avatarMessage && <div className={"fit-avatar-message "+(avatarMessage.type==="success"?"is-success":"is-error")} role={avatarMessage.type==="success"?"status":"alert"}>{avatarMessage.text}</div>}
          {avatarFile && <div className="fit-avatar-actions"><span>Prévia pronta · {(avatarFile.size/1024).toFixed(0)} KB</span><button type="button" className="green-button" onClick={saveAvatarSelection} disabled={avatarBusy}>{avatarBusy ? <><span className="fit-avatar-spinner"/> Enviando foto…</> : "Salvar foto"}</button><button type="button" className="fit-avatar-cancel" onClick={cancelAvatarSelection} disabled={avatarBusy}>Cancelar</button></div>}
          <label htmlFor="fit-goal">Meu objetivo principal</label><select id="fit-goal" value={goal} onChange={e=>setGoal(e.target.value)}><option value="">Selecione um objetivo</option><option value="Ganhar massa muscular">Ganhar massa muscular</option><option value="Perder gordura">Perder gordura</option><option value="Melhorar condicionamento">Melhorar condicionamento</option><option value="Ter mais saúde e energia">Ter mais saúde e energia</option></select><button type="button" className="green-button" style={{marginTop:12}} onClick={()=>window.location.assign("/fitness-profile")}>Editar perfil fitness <ArrowRight size={16}/></button></div></div><div className="fit-note"><Settings size={18}/><span>Seu perfil está conectado à sua conta. Seu progresso e suas preferências são salvos na nuvem.</span></div></section>}
        {activeNav==="IA Fitness" && <section className="fit-page-section"><div className="section-kicker"><span/> ASSISTENTE DE IA</div><h1>Conheça a <span>Vibra AI.</span></h1><p className="fit-page-intro">Use o assistente para dúvidas sobre exercícios, hábitos e sua rotina. O acesso e os limites continuam sendo validados pela conta e pelo plano.</p><div className="panel fit-empty-state-panel"><div className="fit-empty-state"><Sparkles size={28}/><strong>Seu assistente está no botão flutuante</strong><p>Abra a Vibra AI pelo atalho flutuante no canto da tela. Se o seu plano não incluir esse recurso, as permissões existentes continuarão sendo respeitadas.</p></div></div></section>}
        {activeNav==="Comunidade" && <section className="fit-page-section"><div className="section-kicker"><span/> COMUNIDADE VIBRA</div><h1>Evolução em <span>conjunto.</span></h1><p className="fit-page-intro">A área de comunidade ainda não está conectada a publicações, grupos ou interações reais.</p><div className="panel fit-empty-state-panel"><div className="fit-empty-state"><MessageCircle size={28}/><strong>Comunidade em preparação</strong><p>Quando os recursos sociais estiverem disponíveis, eles aparecerão aqui sem conteúdo ou atividades fictícias.</p></div></div></section>}
        <footer className="app-footer"><span>© 2026 VIBRA</span><span>Feito para sua evolução <span className="footer-heart">♥</span></span></footer>
      </div>
    </main>
    <nav className="fit-bottom-nav" aria-label="Navegação principal mobile">
      {[{name:"Visão geral",label:"Início",icon:Home},{name:"Treinos",label:"Treinos",icon:Dumbbell},{name:"IA Fitness",label:"IA",icon:Sparkles},{name:"Progresso",label:"Evolução",icon:TrendingUp},{name:"Meu perfil",label:"Perfil",icon:UserRound}].map(({name,label,icon:Icon})=><button type="button" key={name} className={activeNav===name?"active":""} onClick={()=>changePage(name)} aria-current={activeNav===name?"page":undefined}><Icon size={18}/><span>{label}</span></button>)}
    </nav>
  </div>;
}
