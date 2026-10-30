import { Easing, Platform } from "react-native";

// Identidade visual do protótipo TEIA · Currículo Sob Medida.
export const colors = {
  primary: "#CC004C",
  primaryDark: "#A3003D",
  primarySoft: "#FCE7EE",
  primaryText: "#FFFFFF",

  background: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#F9FAFB",
  border: "#E4E6EB",
  borderStrong: "#CDD1D8",
  text: "#1C1D22",
  muted: "#5F636D",
  subtle: "#8A8E97",

  success: "#00A693",
  successText: "#00715F",
  successSoft: "#E6F6F3",
  warning: "#B86A00",
  warningSoft: "#FFF3DF",
  neutralSoft: "#EEF0F3",
  danger: "#C62828",
  dangerSoft: "#FDECEC",

  overlay: "rgba(20, 16, 24, 0.42)",
};

export const spacing = { xxs: 2, xs: 4, sm: 8, smd: 12, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { xs: 6, sm: 10, md: 16, lg: 22, pill: 999 };

// Escala tipográfica (razão ~1.2), fonte do sistema.
export const font = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "800" as const, color: colors.text, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "800" as const, color: colors.text, letterSpacing: -0.4 },
  h2: { fontSize: 18, lineHeight: 24, fontWeight: "700" as const, color: colors.text },
  h3: { fontSize: 16, lineHeight: 22, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  small: { fontSize: 13, lineHeight: 18, color: colors.muted },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const, color: colors.muted },
  tiny: { fontSize: 12, lineHeight: 16, color: colors.muted },
};

// Profundidade: sombra com deslocamento e desfoque suave (nunca halo).
export const elevation = {
  low: Platform.select({
    web: { boxShadow: "0 1px 2px rgba(28,29,34,0.06), 0 2px 8px rgba(28,29,34,0.04)" },
    default: {
      shadowColor: "#1C1D22",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
  }) as object,
  high: Platform.select({
    web: { boxShadow: "0 8px 28px rgba(28,29,34,0.14)" },
    default: {
      shadowColor: "#1C1D22",
      shadowOpacity: 0.14,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  }) as object,
};

// Movimento: curto e desacelerado; saída mais rápida que a entrada.
export const motion = {
  rapido: 140,
  padrao: 220,
  entrada: 320,
  foco: 700,
  desacelera: Easing.bezier(0.16, 1, 0.3, 1),
  acelera: Easing.bezier(0.4, 0, 1, 1),
};

export const nativo = Platform.OS !== "web";
