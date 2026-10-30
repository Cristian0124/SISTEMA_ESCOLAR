export async function leerPdf(pdf: Uint8Array) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const carga = getDocument({ data: new Uint8Array(pdf), useSystemFonts: true });
  const documento = await carga.promise;
  try {
    const textos: string[] = [];
    for (let i = 1; i <= documento.numPages; i++) {
      const pagina = await documento.getPage(i);
      const contenido = await pagina.getTextContent();
      textos.push(contenido.items.map(item => 'str' in item ? item.str : '').join(' '));
    }
    return { texto: textos.join(' '), paginas: documento.numPages };
  } finally { await carga.destroy(); }
}
