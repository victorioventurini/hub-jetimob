/**
 * Analysis Export Workbook builder.
 *
 * Recebe o payload coletado e produz um Blob .xlsx multi-abas via ExcelJS.
 */
import ExcelJS from "exceljs";
import type { ExportPayload } from "./analysisExport";

interface Column {
  header: string;
  key: string;
  width?: number;
}

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: Column[],
  rows: ReadonlyArray<unknown>,
) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? Math.max(14, c.header.length + 2),
  }));
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  (rows as unknown[]).forEach((r) => ws.addRow(r as never));
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
}

function addTextSheet(wb: ExcelJS.Workbook, name: string, lines: string[]) {
  const ws = wb.addWorksheet(name);
  ws.getColumn(1).width = 120;
  lines.forEach((line, i) => {
    const row = ws.getRow(i + 1);
    row.getCell(1).value = line;
    row.getCell(1).alignment = { wrapText: true, vertical: "top" };
    if (line && !line.startsWith(" ") && line === line.toUpperCase() && line.length < 60) {
      row.getCell(1).font = { bold: true, color: { argb: "FF1F2937" } };
    } else if (i === 0) {
      row.getCell(1).font = { bold: true, size: 14 };
    }
  });
}

export async function buildAnalysisWorkbook(payload: ExportPayload): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Hub da Jet";
  wb.created = new Date();

  // 0. README (texto)
  addTextSheet(wb, "README", payload.readme);

  // 0.1 Metodologia (texto)
  addTextSheet(wb, "Metodologia", payload.metodologia);

  // 1. Overview
  addSheet(wb, "Overview", [
    { header: "Métrica", key: "metrica", width: 42 },
    { header: "Valor", key: "valor", width: 60 },
  ], payload.overview);

  // 2. KPIs — Definições
  addSheet(wb, "KPIs — Definições", [
    { header: "ID", key: "id", width: 38 },
    { header: "Nome", key: "nome", width: 40 },
    { header: "Descrição", key: "descricao", width: 60 },
    { header: "Área", key: "area" },
    { header: "Time", key: "time" },
    { header: "Responsável", key: "responsavel" },
    { header: "Unidade", key: "unidade" },
    { header: "Direção", key: "direcao" },
    { header: "Frequência", key: "frequencia" },
    { header: "Tipo", key: "tipo_indicador" },
    { header: "Escopo", key: "escopo" },
    { header: "Meta anual", key: "meta_ano" },
    { header: "Status", key: "status" },
    { header: "Criado em", key: "criado_em", width: 22 },
  ], payload.kpis.definitions);

  // 3. KPIs — Inputs (denormalizado: cada linha carrega o contexto do KPI)
  addSheet(wb, "KPIs — Inputs", [
    { header: "KPI (ID)", key: "kpi_id", width: 38 },
    { header: "KPI", key: "kpi_nome", width: 40 },
    { header: "Área", key: "area" },
    { header: "Time", key: "time" },
    { header: "Responsável", key: "responsavel", width: 26 },
    { header: "Unidade", key: "unidade" },
    { header: "Direção", key: "direcao" },
    { header: "Frequência", key: "frequencia" },
    { header: "Meta anual", key: "meta_ano" },
    { header: "Data ref.", key: "data_referencia", width: 14 },
    { header: "Período início", key: "periodo_inicio", width: 14 },
    { header: "Período fim", key: "periodo_fim", width: 14 },
    { header: "Rótulo período", key: "periodo_label" },
    { header: "Valor", key: "valor" },
    { header: "RAG", key: "rag" },
    { header: "Tipo de input", key: "input_type" },
    { header: "Origem", key: "origem" },
    { header: "Observação", key: "observacao", width: 50 },
    { header: "Criado em", key: "criado_em", width: 22 },
  ], payload.kpis.inputs);

  // 4. OKRs — Ciclos
  addSheet(wb, "OKRs — Ciclos", [
    { header: "ID", key: "id", width: 38 },
    { header: "Nome", key: "nome", width: 24 },
    { header: "Tipo", key: "tipo" },
    { header: "Início", key: "inicio", width: 14 },
    { header: "Fim", key: "fim", width: 14 },
  ], payload.okrs.cycles);

  // 5. OKRs — Objetivos
  addSheet(wb, "OKRs — Objetivos", [
    { header: "ID", key: "id", width: 38 },
    { header: "Nível", key: "nivel" },
    { header: "Ciclo", key: "ciclo" },
    { header: "Time", key: "time" },
    { header: "Título", key: "titulo", width: 60 },
    { header: "Descrição", key: "descricao", width: 60 },
    { header: "Status", key: "status" },
    { header: "Ano", key: "ano" },
    { header: "Progresso médio (%)", key: "progresso_medio" },
    { header: "Criado em", key: "criado_em", width: 22 },
  ], payload.okrs.objectives);

  // 6. OKRs — Key Results
  addSheet(wb, "OKRs — KRs", [
    { header: "ID", key: "id", width: 38 },
    { header: "Objetivo (ID)", key: "objetivo_id", width: 38 },
    { header: "Objetivo", key: "objetivo", width: 50 },
    { header: "Nível", key: "nivel" },
    { header: "Time", key: "time", width: 24 },
    { header: "Ciclo", key: "ciclo", width: 18 },
    { header: "Título", key: "titulo", width: 60 },
    { header: "Unidade", key: "unidade" },
    { header: "Baseline", key: "baseline" },
    { header: "Atual", key: "atual" },
    { header: "Meta", key: "meta" },
    { header: "Direção", key: "direcao" },
    { header: "Progresso (%)", key: "progresso_pct" },
    { header: "Status", key: "status" },
    { header: "Responsável", key: "responsavel" },
    { header: "KPI vinculado", key: "kpi_vinculado", width: 30 },
    { header: "Iniciativas (total)", key: "iniciativas_total" },
    { header: "Iniciativas (concluídas)", key: "iniciativas_concluidas" },
    { header: "Último check-in", key: "ultimo_checkin", width: 22 },
  ], payload.okrs.keyResults);

  // 7. OKRs — Check-ins
  addSheet(wb, "OKRs — Check-ins", [
    { header: "ID", key: "id", width: 38 },
    { header: "KR (ID)", key: "kr_id", width: 38 },
    { header: "KR", key: "kr_titulo", width: 50 },
    { header: "Data", key: "data", width: 14 },
    { header: "Valor anterior", key: "valor_anterior" },
    { header: "Valor atual", key: "valor_atual" },
    { header: "Confiança", key: "confianca" },
    { header: "Comentário", key: "comentario", width: 50 },
    { header: "Bloqueios", key: "bloqueios", width: 40 },
    { header: "Autor", key: "autor" },
    { header: "Criado em", key: "criado_em", width: 22 },
  ], payload.okrs.checkins);

  // 7.1 OKRs — Iniciativas (o "como" — projetos leves que movem um KR)
  addSheet(wb, "OKRs — Iniciativas", [
    { header: "ID", key: "id", width: 38 },
    { header: "KR (ID)", key: "kr_id", width: 38 },
    { header: "KR", key: "kr_titulo", width: 50 },
    { header: "Objetivo", key: "objetivo", width: 50 },
    { header: "Time", key: "time", width: 24 },
    { header: "Nome", key: "nome", width: 40 },
    { header: "Descrição", key: "descricao", width: 60 },
    { header: "Status", key: "status" },
    { header: "Prioridade", key: "prioridade" },
    { header: "Progresso (%)", key: "progresso_pct" },
    { header: "Responsável", key: "responsavel", width: 26 },
    { header: "Início", key: "inicio", width: 14 },
    { header: "Entrega prevista", key: "entrega", width: 16 },
    { header: "Notas", key: "notas", width: 50 },
    { header: "Criado em", key: "criado_em", width: 22 },
  ], payload.okrs.initiatives);

  // 8. Projetos
  addSheet(wb, "Projetos", [
    { header: "ID", key: "id", width: 38 },
    { header: "Nome", key: "nome", width: 40 },
    { header: "Descrição", key: "descricao", width: 60 },
    { header: "Status", key: "status" },
    { header: "Saúde", key: "saude" },
    { header: "Progresso (%)", key: "progresso_pct" },
    { header: "Owner", key: "owner" },
    { header: "Times", key: "times", width: 30 },
    { header: "Início", key: "inicio", width: 14 },
    { header: "Entrega", key: "entrega", width: 14 },
    { header: "KRs vinculados", key: "krs_vinculados" },
    { header: "KRs vinculados (títulos)", key: "krs_titulos", width: 60 },
    { header: "Criado em", key: "criado_em", width: 22 },
  ], payload.projects.projects);

  // 9. Milestones
  addSheet(wb, "Projetos — Milestones", [
    { header: "Projeto (ID)", key: "project_id", width: 38 },
    { header: "Projeto", key: "projeto", width: 40 },
    { header: "Milestone (ID)", key: "id", width: 38 },
    { header: "Nome", key: "nome", width: 40 },
    { header: "Status", key: "status" },
    { header: "Início", key: "inicio", width: 14 },
    { header: "Entrega", key: "entrega", width: 14 },
    { header: "Owner", key: "owner", width: 30 },
    { header: "Notas", key: "notas", width: 50 },
    { header: "Criado em", key: "criado_em", width: 22 },
  ], payload.projects.milestones);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
