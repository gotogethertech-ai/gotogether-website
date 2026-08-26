import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRealCompanyBySlugServer, getAllVerifiedCompanySlugsServer } from "@/lib/real-companies-server";
import { CompanyProfileClient } from "./CompanyProfileClient";

// Real companies aren't fixed at build time — new ones get verified on an
// ongoing basis, so this renders on demand against the live database
// rather than a frozen set of pre-generated pages (dynamicParams lets a
// newly-verified company's slug resolve immediately, not just after the
// next build).
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllVerifiedCompanySlugsServer();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getRealCompanyBySlugServer(slug);
  if (!company) return { title: "Company not found — GoTogether" };
  return {
    title: `${company.name} — GoTogether`,
  };
}

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getRealCompanyBySlugServer(slug);
  if (!company) notFound();

  return <CompanyProfileClient company={company} />;
}
