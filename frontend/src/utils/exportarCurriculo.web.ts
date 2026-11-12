export async function salvarPDF(conteudo: ArrayBuffer): Promise<void> {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "curriculo.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
