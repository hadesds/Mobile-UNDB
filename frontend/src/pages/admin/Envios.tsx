import { PainelEnvios } from "../../components/envios/PainelEnvios";

/** Administração: gera e revoga links e acompanha os envios (a revisão é do gestor). */
export default function AdminEnvios() {
  return <PainelEnvios podeRevisar={false} />;
}
