import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { companies, getCompanyBySlug } from "@/lib/companies-data";
import { CompanyProfileClient } from "./CompanyProfileClient";

export function generateStaticParams() {
  return companies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  if (!company) return { title: "Company not found — GoTogether" };
  return {
    title: `${company.name} — GoTogether`,
    description: company.description,
  };
}

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  if (!company) notFound();

  return <CompanyProfileClient company={company} />;
}
