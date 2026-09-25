export type Metric = {
  type: string;
  target: string;
  channel: string;
  count: number;
};
export interface ReportDeliveryProvider {
  deliver(report: {
    businessName: string;
    message: string;
  }): Promise<{ sent: boolean; message: string }>;
}
export class PreviewReportDeliveryProvider implements ReportDeliveryProvider {
  async deliver(report: { businessName: string; message: string }) {
    return {
      sent: false,
      message: `${report.businessName}\n${report.message}`,
    };
  }
}
export const metricLabels: Record<string, string> = {
  page_view: "visitas a la página",
  partner_view: "visitas al negocio",
  ad_impression: "impresiones del anuncio",
  promotion_click: "clics en la promoción",
  table_scan: "accesos desde QR de mesa",
  whatsapp: "clics a WhatsApp",
  instagram: "clics a Instagram",
  facebook: "clics a Facebook",
  maps: "clics a Google Maps",
  tripadvisor: "clics a TripAdvisor",
  other: "clics en otros botones",
  link: "clics en enlaces internos",
};
export function reportMessage(rows: Metric[]) {
  if (!rows.length) return "No hay actividad registrada en este período.";
  const totals = new Map<string, number>();
  for (const r of rows) {
    const key = r.type === "button_click" ? r.channel : r.type;
    totals.set(key, (totals.get(key) || 0) + r.count);
  }
  return (
    [...totals]
      .map(([key, count]) => `${count} ${metricLabels[key] || key}`)
      .join(", ") + "."
  );
}
