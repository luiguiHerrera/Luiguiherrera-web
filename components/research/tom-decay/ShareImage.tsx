import type { TomDecayContent } from "@/lib/research/tom-decay/content";

type ShareImageProps = {
  content: TomDecayContent;
  ribbon: string;
};

export function researchShareImage({ content, ribbon }: ShareImageProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#F7F4ED",
        padding: "64px 72px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", height: 5, width: 190, backgroundColor: "#0B3436" }} />

      <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
        <div
          style={{
            display: "flex",
            fontSize: 21,
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#9A7A44",
          }}
        >
          {content.hero.kicker}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 82,
            fontWeight: 700,
            letterSpacing: -2.4,
            lineHeight: 1.02,
            color: "#111716",
          }}
        >
          {content.documentTitle}
        </div>
        <div style={{ display: "flex", marginTop: 22, fontSize: 27, color: "#0B3436" }}>
          {content.descriptor}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, alignItems: "flex-end", marginTop: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" height={196} src={ribbon} width={1056} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid #D8D2C8",
          paddingTop: 22,
          fontSize: 22,
          color: "#69706D",
        }}
      >
        <div style={{ display: "flex", fontWeight: 600, color: "#111716" }}>{content.footer.author}</div>
        <div style={{ display: "flex" }}>luiguiherrera.com</div>
      </div>
    </div>
  );
}
