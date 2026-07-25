import { permanentRedirect } from "next/navigation";

export default function EnglishMarketRedirectPage() {
  permanentRedirect("/en/dashboard");
}
