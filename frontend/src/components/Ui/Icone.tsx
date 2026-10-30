import Svg, { Circle, Path, Rect } from "react-native-svg";

import { colors } from "../../constants/theme";

// Ícones desenhados numa grade de 24, traço único de 1.8 e pontas arredondadas.
const DESENHOS = {
  vagas: (
    <>
      <Rect x={3} y={7} width={18} height={13} rx={2.5} />
      <Path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <Path d="M3 12.5h18" />
    </>
  ),
  candidaturas: (
    <>
      <Path d="M4 13.5 6.6 5.6A2 2 0 0 1 8.5 4.2h7a2 2 0 0 1 1.9 1.4L20 13.5" />
      <Path d="M4 13.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4.5h-4.5l-1.2 2h-4.6l-1.2-2Z" />
    </>
  ),
  curriculo: (
    <>
      <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <Path d="M14 3v5h5" />
      <Path d="M8.5 13h7M8.5 16.5h5" />
    </>
  ),
  conta: (
    <>
      <Circle cx={12} cy={8.5} r={3.8} />
      <Path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  busca: (
    <>
      <Circle cx={11} cy={11} r={6.5} />
      <Path d="m20 20-4.2-4.2" />
    </>
  ),
  filtros: (
    <>
      <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <Circle cx={16} cy={7} r={2} />
      <Circle cx={10} cy={17} r={2} />
    </>
  ),
  direita: <Path d="m9.5 6 6 6-6 6" />,
  baixo: <Path d="m6 9.5 6 6 6-6" />,
  voltar: <Path d="m14.5 6-6 6 6 6" />,
  fechar: <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  check: <Path d="m5 12.5 4.5 4.5L19 7.5" />,
  mais: <Path d="M12 5v14M5 12h14" />,
  menos: <Path d="M5 12h14" />,
  editar: (
    <>
      <Path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z" />
      <Path d="m13.5 6.5 4 4" />
    </>
  ),
  lixeira: (
    <>
      <Path d="M4.5 7h15M9.5 7V4.8h5V7" />
      <Path d="m6.5 7 .9 12.2A1.5 1.5 0 0 0 8.9 20.6h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
    </>
  ),
  calendario: (
    <>
      <Rect x={4} y={5.5} width={16} height={15} rx={2.5} />
      <Path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  local: (
    <>
      <Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <Circle cx={12} cy={10} r={2.4} />
    </>
  ),
  relogio: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7.5V12l3 2" />
    </>
  ),
  ajuda: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6" />
      <Path d="M12 17h.01" />
    </>
  ),
  alerta: (
    <>
      <Path d="M10.3 4.3 2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <Path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  diferente: <Path d="M6 9.5h12M6 14.5h12M15 5.5 9 18.5" />,
  sair: (
    <>
      <Path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14" />
      <Path d="M10 16.5 5.5 12 10 7.5M5.5 12H15" />
    </>
  ),
  escudo: (
    <>
      <Path d="M12 3.5 5 6v5.5c0 4.4 3 7.9 7 9 4-1.1 7-4.6 7-9V6Z" />
      <Path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  atualizar: (
    <>
      <Path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <Path d="M19.5 4.5v4h-4" />
    </>
  ),
  formacao: (
    <>
      <Path d="m2.5 9 9.5-4.5L21.5 9 12 13.5Z" />
      <Path d="M6.5 11v4.6c0 1.3 2.5 2.9 5.5 2.9s5.5-1.6 5.5-2.9V11M21.5 9v5" />
    </>
  ),
  experiencia: (
    <>
      <Rect x={3.5} y={7} width={17} height={12.5} rx={2.5} />
      <Path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M12 11.5v3" />
    </>
  ),
  competencia: (
    <>
      <Path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" />
    </>
  ),
  idioma: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M3.5 12h17M12 3.5c2.3 2.3 3.4 5.2 3.4 8.5s-1.1 6.2-3.4 8.5c-2.3-2.3-3.4-5.2-3.4-8.5S9.7 5.8 12 3.5Z" />
    </>
  ),
  curso: (
    <>
      <Path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h12.5v13H6a1.5 1.5 0 0 0-1.5 1.5Z" />
      <Path d="M4.5 18.5A1.5 1.5 0 0 0 6 20h12.5v-3M8.5 8h6" />
    </>
  ),
  olho: (
    <>
      <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <Circle cx={12} cy={12} r={2.8} />
    </>
  ),
  olhoFechado: (
    <>
      <Path d="M4 4l16 16M10 5.7a8.9 8.9 0 0 1 2-.2c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.6 6.7C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.4-1.1" />
      <Path d="M9.9 10a2.8 2.8 0 0 0 4 4" />
    </>
  ),
  externo: (
    <>
      <Path d="M13.5 4.5h6v6M19.5 4.5 11 13" />
      <Path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  enviar: (
    <>
      <Path d="M20.5 3.5 10 14" />
      <Path d="m20.5 3.5-6.5 17-4-6.5-6.5-4Z" />
    </>
  ),
  painel: (
    <>
      <Rect x={4} y={4} width={7} height={9} rx={1.8} />
      <Rect x={13} y={4} width={7} height={5} rx={1.8} />
      <Rect x={13} y={11} width={7} height={9} rx={1.8} />
      <Rect x={4} y={15} width={7} height={5} rx={1.8} />
    </>
  ),
  usuarios: (
    <>
      <Circle cx={9} cy={8.5} r={3.3} />
      <Path d="M3 19.5a6 6 0 0 1 12 0" />
      <Path d="M15.5 5.6a3.3 3.3 0 0 1 0 5.8M17.5 14a6 6 0 0 1 3.5 5.5" />
    </>
  ),
  empresa: (
    <>
      <Path d="M4.5 20.5V5.5A1.5 1.5 0 0 1 6 4h7a1.5 1.5 0 0 1 1.5 1.5v15" />
      <Path d="M14.5 10H18a1.5 1.5 0 0 1 1.5 1.5v9M3 20.5h18" />
      <Path d="M8 8h3M8 11.5h3M8 15h3" />
    </>
  ),
  importar: (
    <>
      <Path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
      <Path d="M4.5 14.5v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" />
    </>
  ),
  cadastros: (
    <>
      <Path d="M4.5 7.5 12 4l7.5 3.5L12 11Z" />
      <Path d="m4.5 12 7.5 3.5 7.5-3.5M4.5 16.5 12 20l7.5-3.5" />
    </>
  ),
  desfazer: (
    <>
      <Path d="M9 14.5 4.5 10 9 5.5" />
      <Path d="M4.5 10h9.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  bloquear: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="m6 6 12 12" />
    </>
  ),
} as const;

export type NomeIcone = keyof typeof DESENHOS;

type Props = { nome: NomeIcone; tamanho?: number; cor?: string; espessura?: number };

export function Icone({ nome, tamanho = 22, cor = colors.text, espessura = 1.8 }: Props) {
  return (
    <Svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={espessura}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {DESENHOS[nome]}
    </Svg>
  );
}
