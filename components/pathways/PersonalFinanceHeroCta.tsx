"use client";

type PersonalFinanceHeroCtaProps = {
  label: string;
};

export function PersonalFinanceHeroCta({ label }: PersonalFinanceHeroCtaProps) {
  function moveToGuidedRoute() {
    const target = document.getElementById("personal-finance-guided-route");
    if (!target) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <button
      type="button"
      aria-controls="personal-finance-guided-route"
      className="inline-flex min-h-12 items-center justify-center rounded-[4px] border border-petrol bg-petrol px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(11,52,54,0.14)] transition hover:bg-white hover:text-petrol focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol"
      onClick={moveToGuidedRoute}
    >
      {label}
    </button>
  );
}
