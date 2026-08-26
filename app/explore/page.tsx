import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ExploreClient } from "./ExploreClient";

export const metadata = {
  title: "Explore Trips — GoTogether",
  description:
    "Search real trips already being planned from Delhi NCR, filter by budget, dates, trip type and more, and find your next travel companions.",
};

export default function ExplorePage() {
  return (
    <>
      <Header activePath="/explore" />
      <main className="flex-1">
        <Suspense fallback={null}>
          <ExploreClient />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
