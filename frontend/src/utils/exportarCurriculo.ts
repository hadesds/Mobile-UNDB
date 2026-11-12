import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function salvarPDF(conteudo: ArrayBuffer): Promise<void> {
  if (!await Sharing.isAvailableAsync()) {
    throw new Error("O compartilhamento de arquivos não está disponível neste aparelho.");
  }
  const arquivo = new File(Paths.cache, `curriculo-${Date.now()}.pdf`);
  try {
    await arquivo.write(new Uint8Array(conteudo));
    await Sharing.shareAsync(arquivo.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Salvar ou compartilhar currículo" });
  } finally {
    if (arquivo.exists) await arquivo.delete();
  }
}
