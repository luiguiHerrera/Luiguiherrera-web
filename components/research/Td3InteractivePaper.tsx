import type { Td3PaperContent } from "@/lib/research/td3-paper";
import { td3Editorial } from "@/lib/research/td3-editorial";
import { td3VisualContent } from "@/lib/research/td3-visual-content";
import { EditorialByline } from "@/components/editorial/EditorialByline";
import {
  AppendixSection,
  BootstrapValidationFigure,
  ClaimLadder,
  ClaimsSurvivalTable,
  ContributionFlow,
  EvaluationProtocolFigure,
  ExecutionStressFigure,
  FalseConfidenceFigure,
  FinalAnswerCards,
  PaperHero,
  PaperNavigation,
  PortfolioUniverseFigure,
  RankingEvidenceTables,
  TD3MechanismDiagram,
} from "@/components/research/td3/Td3Figures";

type Td3InteractivePaperProps = {
  content: Td3PaperContent;
};

export function Td3InteractivePaper({ content }: Td3InteractivePaperProps) {
  const visual = td3VisualContent[content.locale];
  const ids =
    content.locale === "en"
      ? { claims: "claims", method: "method", evidence: "evidence", conclusion: "conclusion", appendix: "appendix" }
      : { claims: "claims", method: "metodo", evidence: "evidencia", conclusion: "conclusion", appendix: "apendice" };
  const navigationLabel = content.locale === "en" ? "Interactive paper sections" : "Secciones del paper interactivo";
  const editorial = td3Editorial[content.locale];

  return (
    <article className="mx-auto max-w-7xl overflow-x-clip px-4 pb-8 md:px-5 md:pb-12">
      <PaperHero content={content.hero} locale={content.locale} />
      <div className="mx-auto max-w-4xl">
        <EditorialByline
          locale={content.locale}
          modifiedAt={editorial.modifiedAt}
          publishedAt={editorial.publishedAt}
        />
      </div>
      <PaperNavigation items={visual.navigation} label={navigationLabel} />

      <FalseConfidenceFigure content={visual.backtest} />

      <div id={ids.claims} className="scroll-mt-24">
        <ClaimLadder content={visual.ladder} />
      </div>

      <div id={ids.method} className="scroll-mt-24">
        <PortfolioUniverseFigure content={visual.universe} universe={content.universe} />
        <TD3MechanismDiagram content={visual.mechanism} />
        <EvaluationProtocolFigure content={visual.evaluation} />
      </div>

      <div id={ids.evidence} className="scroll-mt-24">
        <RankingEvidenceTables content={visual.ranking} protocols={content.cash.protocols} />
        <BootstrapValidationFigure content={visual.statistics} protocols={content.cash.protocols} />
        <ExecutionStressFigure content={visual.execution} />
        <ClaimsSurvivalTable content={visual.claims} />
      </div>

      <ContributionFlow content={visual.contribution} />

      <div id={ids.conclusion} className="scroll-mt-24">
        <FinalAnswerCards content={visual.final} />
      </div>

      <AppendixSection content={visual.appendix} id={ids.appendix} />
    </article>
  );
}
