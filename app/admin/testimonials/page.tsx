import type { Metadata } from "next";
import { TestimonialsClient } from "./TestimonialsClient";

export const metadata: Metadata = { title: "Testimonials — Admin — GoTogether" };

export default function AdminTestimonialsPage() {
  return <TestimonialsClient />;
}
