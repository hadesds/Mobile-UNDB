// Identidade visual do protótipo TEIA · Currículo Sob Medida.
export const colors = {
  primary: "#CC004C",
  primaryDark: "#A3003D",
  primarySoft: "#FCE7EE",
  primaryText: "#FFFFFF",

  background: "#F5F6F8",
  surface: "#FFFFFF",
  border: "#E4E6EB",
  text: "#1C1D22",
  muted: "#6B6F78",

  success: "#00A693",
  successText: "#00715F",
  successSoft: "#E6F6F3",
  warning: "#B86A00",
  warningSoft: "#FFF3DF",
  neutralSoft: "#EEF0F3",
  danger: "#C62828",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

export const font = {
  title: { fontSize: 26, fontWeight: "800" as const, color: colors.text },
  h2: { fontSize: 18, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 15, color: colors.text, lineHeight: 22 },
  small: { fontSize: 13, color: colors.muted },
  label: { fontSize: 13, color: colors.muted },
};