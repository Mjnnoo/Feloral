import { CmsEditorProvider } from "@/components/cms/cms-editor-provider";
import { CmsEditorSidebar } from "@/components/cms/cms-editor-sidebar";
import { CmsEditorToolbar } from "@/components/cms/cms-editor-toolbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CmsBenefits } from "@/components/home/cms-benefits";
import { CmsHomeHero } from "@/components/home/cms-home-hero";
import { CmsProductsShowcase } from "@/components/home/cms-products-showcase";
import { getPublicHomepage } from "@/lib/cms/cms-api";
export const dynamic = "force-dynamic";
export default async function Home() {
  const cms = await getPublicHomepage();

  const theme = cms?.theme;
  const logoText = theme?.logoText || "FELORAL";
  const accentColor = theme?.accentColor || "#d6a84f";
  const darkColor = theme?.darkColor || "#070707";

  return (
    <CmsEditorProvider cms={cms}>
      <CmsEditorToolbar />
      <CmsEditorSidebar />

      <SiteHeader cms={cms} logoText={logoText} accentColor={accentColor} darkColor={darkColor} />

      <main style={{ backgroundColor: theme?.backgroundColor || "#f6f0e8", color: theme?.textColor || "#101010" }}>
        <CmsHomeHero cms={cms} />
        <CmsBenefits cms={cms} accentColor={accentColor} />
        <CmsProductsShowcase cms={cms} />
      </main>

      <SiteFooter cms={cms} logoText={logoText} accentColor={accentColor} darkColor={darkColor} />
    </CmsEditorProvider>
  );
}
