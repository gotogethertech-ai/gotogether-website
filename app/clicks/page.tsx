import type { Metadata } from "next";
import { ClicksFeedClient } from "./ClicksFeedClient";

export const metadata: Metadata = {
  title: "Clicks — Travel Stories from Real Trips | GoTogether",
  description: "Photos and stories from real GoTogether trips — discover destinations, travel experiences, and the travellers behind them.",
};

export default function ClicksPage() {
  return <ClicksFeedClient />;
}
