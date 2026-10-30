import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Carregando } from "../components/Layout/Carregando";
import { IconeAba } from "../components/Layout/IconeAba";
import type { NomeIcone } from "../components/Ui";
import { colors } from "../constants/theme";
import AdminCadastros from "../pages/admin/Cadastros";
import AdminUsuarios, { type FiltroUsuarios } from "../pages/admin/Usuarios";
import VisaoGeral from "../pages/admin/VisaoGeral";
import Cadastro from "../pages/Cadastro";
import CandidaturaDetalhe from "../pages/CandidaturaDetalhe";
import Candidaturas from "../pages/Candidaturas";
import Conta from "../pages/Conta";
import Curriculo from "../pages/Curriculo";
import ImportarCurriculo from "../pages/ImportarCurriculo";
import CandidatoGestor from "../pages/gestor/CandidatoDetalhe";
import EditarVaga from "../pages/gestor/EditarVaga";
import Painel from "../pages/gestor/Painel";
import VagaGestor from "../pages/gestor/VagaGestor";
import VagasGestor from "../pages/gestor/VagasGestor";
import Login from "../pages/Login";
import VagaDetalhe from "../pages/VagaDetalhe";
import Vagas from "../pages/Vagas";
import { useAuth } from "./auth";
import type { StatusVaga } from "../types";
import { CandidaturasProvider } from "./candidaturas";

// ---- Tipos das rotas -------------------------------------------------------

export type AuthStackParams = {
  Login: undefined;
  Cadastro: undefined;
};

/** Rotas das pilhas internas (cada aba registra as que usa). */
export type AppStackParams = {
  VagasLista: undefined;
  CandidaturasLista: undefined;
  CurriculoInicio: undefined;
  ImportarCurriculo: undefined;
  VagaDetalhe: { id: number };
  Candidatura: { id: number; recemCriada?: boolean };
};

export type AlunoTabsParams = {
  VagasTab: undefined;
  CandidaturasTab: undefined;
  CurriculoTab: undefined;
  Conta: undefined;
};

/** Pilha das abas do gestor do TEIA. `pedido` força reaplicar um filtro vindo de outra tela. */
export type GestorStackParams = {
  PainelInicio: undefined;
  VagasGestorLista: { status?: StatusVaga; pedido?: number } | undefined;
  VagaGestor: { id: number };
  EditarVaga: { id?: number };
  Candidato: { id: number };
};

export type GestorTabsParams = {
  PainelTab: undefined;
  VagasTab: undefined;
  Conta: undefined;
};

export type AdminTabsParams = {
  VisaoGeral: undefined;
  Cadastros: { secao?: "empresas" | "competencias" | "cursos"; filtro?: "atencao"; pedido?: number } | undefined;
  Usuarios: { filtro?: FiltroUsuarios; pedido?: number } | undefined;
  Conta: undefined;
};

// ---- Navegadores -----------------------------------------------------------

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const Stack = createNativeStackNavigator<AppStackParams>();
const Tabs = createBottomTabNavigator<AlunoTabsParams>();
const GestorStack = createNativeStackNavigator<GestorStackParams>();
const GestorTabsNav = createBottomTabNavigator<GestorTabsParams>();
const AdminTabsNav = createBottomTabNavigator<AdminTabsParams>();

const tema = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

const cabecalho = {
  headerTitleStyle: { fontWeight: "700" as const, fontSize: 17 },
  headerTintColor: colors.text,
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: "minimal" as const,
  contentStyle: { backgroundColor: colors.background },
};

const detalhes = (
  <>
    <Stack.Screen name="VagaDetalhe" component={VagaDetalhe} options={{ title: "Vaga" }} />
    <Stack.Screen name="Candidatura" component={CandidaturaDetalhe} options={{ title: "Sua candidatura" }} />
  </>
);

function VagasNavigator() {
  return (
    <Stack.Navigator screenOptions={cabecalho}>
      <Stack.Screen name="VagasLista" component={Vagas} options={{ headerShown: false, title: "Vagas" }} />
      {detalhes}
    </Stack.Navigator>
  );
}

function CandidaturasNavigator() {
  return (
    <Stack.Navigator screenOptions={cabecalho}>
      <Stack.Screen
        name="CandidaturasLista"
        component={Candidaturas}
        options={{ headerShown: false, title: "Candidaturas" }}
      />
      {detalhes}
    </Stack.Navigator>
  );
}

function CurriculoNavigator() {
  return (
    <Stack.Navigator screenOptions={cabecalho}>
      <Stack.Screen name="CurriculoInicio" component={Curriculo} options={{ headerShown: false, title: "Currículo" }} />
      <Stack.Screen name="ImportarCurriculo" component={ImportarCurriculo} options={{ title: "Revisar importação" }} />
    </Stack.Navigator>
  );
}

const icone = (nome: NomeIcone) =>
  function Icone({ color, focused }: { color: string; focused: boolean }) {
    return <IconeAba nome={nome} focado={focused} cor={color} />;
  };

/** Mesma barra de abas para aluno, gestor e admin. */
function useOpcoesAbas() {
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primaryDark,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: { fontSize: 12, fontWeight: "600" as const },
    tabBarStyle: {
      height: 70 + insets.bottom,
      paddingTop: 8,
      paddingBottom: Math.max(insets.bottom, 8),
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    animation: "fade" as const,
  };
}

function AlunoTabs() {
  const opcoes = useOpcoesAbas();
  return (
    <CandidaturasProvider>
      <Tabs.Navigator screenOptions={opcoes}>
        <Tabs.Screen name="VagasTab" component={VagasNavigator} options={{ title: "Vagas", tabBarIcon: icone("vagas") }} />
        <Tabs.Screen
          name="CandidaturasTab"
          component={CandidaturasNavigator}
          options={{ title: "Candidaturas", tabBarIcon: icone("candidaturas") }}
        />
        <Tabs.Screen
          name="CurriculoTab"
          component={CurriculoNavigator}
          options={{ title: "Currículo", tabBarIcon: icone("curriculo") }}
        />
        <Tabs.Screen name="Conta" component={Conta} options={{ title: "Conta", tabBarIcon: icone("conta") }} />
      </Tabs.Navigator>
    </CandidaturasProvider>
  );
}

// ---- Gestor do TEIA --------------------------------------------------------

const telasGestor = (
  <>
    <GestorStack.Screen name="VagaGestor" component={VagaGestor} options={{ title: "" }} />
    <GestorStack.Screen name="EditarVaga" component={EditarVaga} options={{ title: "Vaga" }} />
    <GestorStack.Screen name="Candidato" component={CandidatoGestor} options={{ title: "Candidatura" }} />
  </>
);

function PainelNavigator() {
  return (
    <GestorStack.Navigator screenOptions={cabecalho}>
      <GestorStack.Screen name="PainelInicio" component={Painel} options={{ headerShown: false, title: "Painel" }} />
      {telasGestor}
    </GestorStack.Navigator>
  );
}

function VagasGestorNavigator() {
  return (
    <GestorStack.Navigator screenOptions={cabecalho}>
      <GestorStack.Screen name="VagasGestorLista" component={VagasGestor} options={{ headerShown: false, title: "Vagas" }} />
      {telasGestor}
    </GestorStack.Navigator>
  );
}

function GestorTabs() {
  const opcoes = useOpcoesAbas();
  return (
    <GestorTabsNav.Navigator screenOptions={opcoes}>
      <GestorTabsNav.Screen name="PainelTab" component={PainelNavigator} options={{ title: "Painel", tabBarIcon: icone("painel") }} />
      <GestorTabsNav.Screen name="VagasTab" component={VagasGestorNavigator} options={{ title: "Vagas", tabBarIcon: icone("vagas") }} />
      <GestorTabsNav.Screen name="Conta" component={Conta} options={{ title: "Conta", tabBarIcon: icone("conta") }} />
    </GestorTabsNav.Navigator>
  );
}

// ---- Administração ---------------------------------------------------------

function AdminTabs() {
  const opcoes = useOpcoesAbas();
  return (
    <AdminTabsNav.Navigator screenOptions={opcoes}>
      <AdminTabsNav.Screen name="VisaoGeral" component={VisaoGeral} options={{ title: "Visão geral", tabBarIcon: icone("painel") }} />
      <AdminTabsNav.Screen name="Cadastros" component={AdminCadastros} options={{ title: "Cadastros", tabBarIcon: icone("cadastros") }} />
      <AdminTabsNav.Screen name="Usuarios" component={AdminUsuarios} options={{ title: "Usuários", tabBarIcon: icone("usuarios") }} />
      <AdminTabsNav.Screen name="Conta" component={Conta} options={{ title: "Conta", tabBarIcon: icone("conta") }} />
    </AdminTabsNav.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={cabecalho}>
      <AuthStack.Screen name="Login" component={Login} options={{ headerShown: false }} />
      <AuthStack.Screen name="Cadastro" component={Cadastro} options={{ title: "Criar conta" }} />
    </AuthStack.Navigator>
  );
}

export function RootNavigator() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <Carregando simples />;

  return (
    <NavigationContainer theme={tema}>
      {!usuario ? (
        <AuthNavigator />
      ) : usuario.perfil === "aluno" ? (
        <AlunoTabs />
      ) : usuario.perfil === "gestor" ? (
        <GestorTabs />
      ) : (
        <AdminTabs />
      )}
    </NavigationContainer>
  );
}
