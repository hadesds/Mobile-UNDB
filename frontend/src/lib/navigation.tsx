import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";

import { Carregando } from "../components/Layout/Carregando";
import { colors } from "../constants/theme";
import Cadastro from "../pages/Cadastro";
import Conta from "../pages/Conta";
import EmBreve from "../pages/EmBreve";
import Login from "../pages/Login";
import ResultadoAnalise from "../pages/ResultadoAnalise";
import VagaDetalhe from "../pages/VagaDetalhe";
import Vagas from "../pages/Vagas";
import { useAuth } from "./auth";

// ---- Tipos das rotas -------------------------------------------------------

export type AuthStackParams = {
  Login: undefined;
  Cadastro: undefined;
};

export type VagasStackParams = {
  VagasLista: undefined;
  VagaDetalhe: { id: number };
  ResultadoAnalise: { id: number };
};

export type AlunoTabsParams = {
  VagasTab: undefined;
  Candidaturas: undefined;
  Curriculo: undefined;
  Conta: undefined;
};

// ---- Navegadores -----------------------------------------------------------

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const VagasStack = createNativeStackNavigator<VagasStackParams>();
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
  headerTitleStyle: { fontWeight: "700" as const },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: "minimal" as const,
};

function VagasNavigator() {
  return (
    <VagasStack.Navigator screenOptions={cabecalho}>
      <VagasStack.Screen name="VagasLista" component={Vagas} options={{ title: "Vagas" }} />
      <VagasStack.Screen
        name="VagaDetalhe"
        component={VagaDetalhe}
        options={{ title: "Detalhes da vaga" }}
      />
      <VagasStack.Screen
        name="ResultadoAnalise"
        component={ResultadoAnalise}
        options={{ title: "Resultado da análise" }}
      />
    </VagasStack.Navigator>
  );
}

// Ícones em texto para não depender de pacote de ícones nesta etapa.
const icone = (simbolo: string) =>
  function Icone({ color }: { color: string }) {
    return <Text style={{ color, fontSize: 18 }}>{simbolo}</Text>;
  };

function AlunoTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        ...cabecalho,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="VagasTab"
        component={VagasNavigator}
        options={{ title: "Vagas", headerShown: false, tabBarIcon: icone("▤") }}
      />
      <Tabs.Screen
        name="Candidaturas"
        component={EmBreve}
        options={{ tabBarIcon: icone("◷") }}
      />
      <Tabs.Screen
        name="Curriculo"
        component={EmBreve}
        options={{ title: "Currículo", tabBarIcon: icone("☰") }}
      />
      <Tabs.Screen name="Conta" component={Conta} options={{ tabBarIcon: icone("◉") }} />
    </Tabs.Navigator>
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
  if (carregando) return <Carregando />;

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