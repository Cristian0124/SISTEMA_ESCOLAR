import PDFDocument from "pdfkit";
import type { ResumenMatricula } from "../repositorios/documentos.repository";

export function generarResumenPdf(resumen: ResumenMatricula): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50,
      info: { Title: "Resumen informativo de matrícula", Author: "Sistema Escolar" } });
    const partes: Buffer[] = [];
    doc.on("data", (parte: Buffer) => partes.push(parte));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
    try {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#176d85").text("SISTEMA ESCOLAR");
      doc.moveDown().fontSize(22).fillColor("#243a3c").text("Resumen de matrícula");
      doc.moveDown(0.5).font("Helvetica").fontSize(10).fillColor("#536b6e")
        .text("Resumen informativo generado por el sistema. No constituye una certificación oficial.");
      doc.moveDown(1.5).fillColor("#243a3c");
      doc.text(`Estudiante: ${resumen.estudiante.nombre}`);
      doc.text(`Identificación: ${resumen.estudiante.cedula ?? 'No registrada'}`);
      doc.text(`Carrera: ${resumen.estudiante.carrera ?? 'No registrada'}`);
      doc.text(`Periodo académico: ${resumen.periodo}`);
      doc.moveDown(1.5).font("Helvetica-Bold").fontSize(14).text("Cursos activos");
      doc.moveDown(0.5);
      for (const curso of resumen.cursos) {
        const titulo = `${curso.codigo} - ${curso.nombre}`;
        doc.font("Helvetica-Bold").fontSize(11);
        const alto = doc.heightOfString(titulo) + doc.heightOfString(`Horario: ${curso.horario}`) + 60;
        if (doc.y + alto > doc.page.height - 60) doc.addPage();
        doc.fillColor("#243a3c").text(titulo);
        doc.font("Helvetica").fontSize(10).fillColor("#536b6e")
          .text(`Horario: ${curso.horario}`)
          .text(`Créditos: ${curso.creditos}`);
        doc.moveDown();
      }
      if (doc.y > doc.page.height - 110) doc.addPage();
      doc.moveDown(0.5).font("Helvetica-Bold").fontSize(13).fillColor("#176d85")
        .text(`Total de créditos: ${resumen.totalCreditos}`);
      doc.moveDown().font("Helvetica").fontSize(9).fillColor("#536b6e")
        .text("Incluye únicamente las matrículas activas del periodo indicado al momento de la consulta.");
      doc.end();
    } catch (error) { doc.destroy(); reject(error); }
  });
}
