import type { Metadata } from "next";
import LandingClient from "./LandingClient";

export const metadata: Metadata = {
  title: "AbhyasMitra Premium — Engineering Notes for SPPU Students",
  description:
    "Browse and purchase premium subject-wise engineering notes for SPPU. Study smarter, score higher with expertly curated PDF notes.",
};

export default function HomePage() {
  return <LandingClient />;
}
