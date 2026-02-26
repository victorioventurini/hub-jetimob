/**
 * CSV export utility — generate and download CSV blob
 */
import type { Opportunity, Participant } from "../types";
import { PARTICIPANTS_MOCK } from "../mocks/participants";
import { EVENTS_MOCK } from "../mocks/events";

const participantMap = new Map(PARTICIPANTS_MOCK.map((p) => [p.id, p]));
const eventMap = new Map(EVENTS_MOCK.map((e) => [e.id, e]));

export function exportOpportunitiesCsv(opportunities: Opportunity[]) {
  const headers = [
    "ID Oportunidade", "Data Captura", "Capturado por",
    "Evento", "Data Evento", "Local Evento",
    "Participante", "Email", "Telefone", "Cidade", "UF",
    "Cargo", "Empresa", "Tipo Empresa", "Área Atuação",
    "Áreas de Interesse", "Observações", "Fit Score",
  ];

  const rows = opportunities.map((opp) => {
    const p = participantMap.get(opp.participantId);
    const e = eventMap.get(opp.eventId);
    return [
      opp.id,
      new Date(opp.capturedAt).toLocaleString("pt-BR"),
      opp.capturedBy,
      e?.name ?? "",
      e?.date ?? "",
      e ? `${e.city}/${e.uf}` : "",
      p?.fullName ?? "",
      p?.email ?? "",
      p?.phone ?? "",
      p?.city ?? "",
      p?.uf ?? "",
      p?.jobTitle ?? "",
      p?.companyName ?? "",
      p?.companyType ?? "",
      p?.operationArea ?? "",
      opp.areasOfInterest.join("; "),
      opp.observations,
      String(opp.fitScore),
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `oportunidades_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
