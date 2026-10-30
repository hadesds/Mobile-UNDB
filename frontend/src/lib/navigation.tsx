import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Carregando } from "../components/Layout/Carregando";
import { IconeAba } from "../components/Layout/IconeAba";
import type { NomeIcone } from "../components/Ui";
import { colors } from "../constants/theme";
import Cadastro from "../pages/Cadastro";
import CandidaturaDetalhe from "../pages/CandidaturaDetalhe";
import Candidaturas from "../pages/Candidaturas";
import Conta from "../pages/Conta";
import Curriculo from "../pages/Curriculo";
import Login from "../pages/Login";
import VagaDetalhe from "../pages/VagaDetalhe";
import Vagas from "../pages/Vagas";
import { useAuth } from "./auth";
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
  VagaDetalhe: { id: number };
  Candidatura: { id: number; recemCriada?: boolean };
};

export type AlunoTabsParams = {
  VagasTab: undefined;
  CandidaturasTab: undefined;
  CurriculoTab: undefined;
  Conta: undefined;
};

// ---- Navegadores -----------------------------------------------------------

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const Stack = createNativeStackNavigator<AppStackParams>();
const Tabs = createBottomTabNavigator<AlunoTabsParams>();

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
    </Stack.Navigator>
  );
}

const icone = (nome: NomeIcone) =>
  function Icone({ color, focused }: { color: string; focused: boolean }) {
    return <IconeAba nome={nome} focado={focused} cor={color} />;
  };

function AlunoTabs() {
  const insets = useSafeAreaInsets();
  return (
    <CandidaturasProvider>
      <Tabs.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
          tabBarStyle: {
            height: 70 + insets.bottom,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
          animation: "fade",
        }}
      >
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
      ) : (
        // Área do gestor ainda não foi construída: mostra a conta com o botão de sair.
        <Conta />
      )}
    </NavigationContainer>
  );
}
