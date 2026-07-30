import { StartPathPage, type StartPathContent } from "@/components/pathways/StartPathPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/start");

const content: StartPathContent = {
  locale: "en",
  hero: {
    eyebrow: "Guided path",
    title: "Get your finances in order before you invest",
    subtitle:
      "Create a budget, organize your debts, or check whether you are ready to invest. No account required, and your data stays in your browser.",
    guarantee: "No account required · Your data stays in your browser",
  },
  primaryActions: [
    {
      label: "Create my budget",
      href: "/en/budget",
      description: "Organize your income, expenses, and commitments to understand your monthly margin.",
    },
    {
      label: "Organize my debts",
      href: "/en/debt",
      description: "Add your debts and compare different ways to prioritize your payments.",
    },
  ],
  orientation: {
    title: "Not sure where to start?",
    items: [
      {
        situation: "I do not know where my money goes.",
        href: "/en/budget",
        destinationLabel: "Go to budget",
      },
      {
        situation: "My debts take up too much of my income.",
        href: "/en/debt",
        destinationLabel: "Review my debts",
      },
      {
        situation: "I want to build an emergency fund.",
        href: "/en/budget",
        destinationLabel: "Go to budget",
        support:
          "Start by calculating your monthly margin and the estimated coverage of your available savings.",
      },
      {
        situation: "I want to know whether I am ready to invest.",
        href: "/en/diagnostic?mode=quick",
        destinationLabel: "Open quick diagnostic",
      },
    ],
  },
  learning: {
    actionLabel: "Open",
    title: "Learn and go deeper",
    introduction:
      "You do not need to start with z-scores or quantitative models. You can begin with the essentials: understand cash flow, debt, margin of error, and then think about investing.",
    purpose:
      "This path helps you start with personal context, cash flow, debt, margin of safety, and judgment.",
    links: [
      {
        meta: "Diagnostic",
        label: "Full diagnostic",
        href: "/en/diagnostic?mode=complete",
        description: "A deeper assessment across capacity, goals, behavior and consistency.",
      },
      {
        meta: "Practice",
        label: "Financial decision simulator",
        href: "/en/protection",
        description: "Short cases to train better questions before putting money at risk.",
      },
      {
        meta: "Warnings",
        label: "Money warning signs",
        href: "/en/protect-your-money",
        description: "Warning signs before committing capital.",
      },
      {
        meta: "Next level",
        label: "View investor mode",
        href: "/en/investor",
        description: "Access educational market and research tools.",
      },
    ],
    closingNote:
      "This path does not oversimplify the work. It orders the process: margin of error first, then protection, then context.",
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      {
        question: "Where should I start if I have never organized my finances?",
        answer:
          "This is a guided path for organizing diagnostics, budget, debt, financial decisions, and warning signs before investing. You can start with your budget or debt and then move on to diagnostics and protection.",
      },
      {
        question: "Do I need to create an account?",
        answer: "No. You can use this path and its tools without creating an account.",
      },
      {
        question: "Does my financial data leave my browser?",
        answer:
          "No. The financial data you enter into the tools is processed in your browser and is not sent to a server.",
      },
      {
        question: "Should I pay off debt before investing?",
        answer:
          "Not necessarily. The right order depends on your stability, the cost of the debt, your ability to make payments, and the protection available. This content does not evaluate a complete personal situation or replace financial, tax, or legal advice.",
      },
    ],
  },
};

export default function EnglishStartPage() {
  return <StartPathPage content={content} />;
}
