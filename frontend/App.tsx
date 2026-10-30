import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AvisoProvider } from "./src/components/Ui";
import { AuthProvider } from "./src/lib/auth";
import { RootNavigator } from "./src/lib/navigation";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AvisoProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </AvisoProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
