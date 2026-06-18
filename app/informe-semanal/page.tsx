import { WeeklyReport } from "@/components/reports/WeeklyReport";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { buildWeeklyReportData } from "@/lib/reports/build-weekly-report-data";

export const revalidate = 86400;

export default async function InformeSemanalPage() {
  const reportData = await buildWeeklyReportData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-14">
      <div className="grid gap-5 md:gap-8 lg:grid-cols-[1fr_0.76fr] lg:items-end">
        <SectionHeader
          eyebrow="Lectura semanal"
          title="Informe semanal"
          subtitle="Una lectura de cierre para ordenar régimen, ETFs, sectores, volatilidad, flujos, niveles y estacionalidad."
        />
        <DisclaimerBox>
          Informe educativo de contexto. No constituye recomendación de inversión ni asesoría financiera.
        </DisclaimerBox>
      </div>

      <div className="mt-6 md:mt-8">
        <WeeklyReport data={reportData} />
      </div>
    </div>
  );
}
