import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { PainelEnvios } from "../../components/envios/PainelEnvios";
import type { GestorStackParams } from "../../lib/navigation";

type Props = NativeStackScreenProps<GestorStackParams, "EnviosInicio">;

/** Gestor: gera links, acompanha e revisa as vagas enviadas pelas empresas. */
export default function EnviosGestor({ navigation }: Props) {
  return (
    <PainelEnvios
      podeRevisar
      onAbrirSolicitacao={(s) =>
        s.status === "publicada" && s.vaga
          ? navigation.navigate("VagaGestor", { id: s.vaga })
          : navigation.navigate("EditarVaga", { solicitacao: s.id })
      }
    />
  );
}
