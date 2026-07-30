import { StartPathPage, type StartPathContent } from "@/components/pathways/StartPathPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/start");

const content: StartPathContent = {
  locale: "en",
  hero: {
    eyebrow: "Guided path",
    title: "Get your finances in order before you invest",
    subtitle:
      "Create a budget, organize your debts, or check whether you are ready to invest. No account required: we do not store the financial data you enter.",
    guarantee: "No account required · We do not store the financial data you enter",
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
          "Start by calculating how much you have left each month and how much savings you have available.",
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
        label: "Understand your investor profile",
        href: "/en/diagnostic?mode=complete",
        description:
          "An educational questionnaire to understand your financial capacity, goals, and how you make investment decisions.",
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
        question: "Do we store your financial data?",
        answer:
          "No. Your income, expenses, and debts are calculated directly in your browser. We do not store the financial data you enter or send it to our servers.",
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
