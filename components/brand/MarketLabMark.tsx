import Image from "next/image";

export function MarketLabMark() {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center gap-1.5 sm:gap-2">
      <span className="flex shrink-0 items-center gap-1">
        <span className="h-1.5 w-1.5 rotate-45 border border-brass" />
        <span className="h-px w-4 bg-brass sm:w-5 lg:w-7" />
      </span>
      <Image
        src="/brand/luigui-herrera/v1/luigui-herrera-monograma-lh-transparent-lossless.webp"
        alt=""
        width={680}
        height={824}
        sizes="(max-width: 639px) 24px, (max-width: 1023px) 27px, 30px"
        className="h-7 w-auto object-contain sm:h-8 lg:h-9"
      />
      <span className="flex shrink-0 items-center gap-1">
        <span className="h-px w-4 bg-brass sm:w-5 lg:w-7" />
        <span className="h-1.5 w-1.5 rotate-45 border border-brass" />
      </span>
    </span>
  );
}
