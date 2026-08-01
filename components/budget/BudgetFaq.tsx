import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import type { BudgetLocale } from "@/lib/personal-finance/budget/types";

export function BudgetFaq({ locale }: { locale: BudgetLocale }) {
  const labels = budgetTargetCopy[locale];
  const questions = labels.faq[locale];

  return (
    <section
      aria-labelledby="budget-faq-title"
      className="mt-8 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6"
    >
      <h2 className="text-2xl font-semibold leading-tight text-ink" id="budget-faq-title">
        {labels.faqTitle}
      </h2>
      <div className="mt-5 divide-y divide-line border-y border-line">
        {questions.map(([question, answer]) => (
          <details className="py-4" key={question}>
            <summary className="cursor-pointer pr-4 text-base font-semibold leading-6 text-petrol">
              {question}
            </summary>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
