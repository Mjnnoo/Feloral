import { benefits } from "@/data/home-v3";
import type { CmsHomepageResponse } from "@/lib/cms/types";
import { getText } from "@/lib/cms/content";
import { CmsEditMarker } from "@/components/cms/cms-edit-marker";

type Props = {
  cms?: CmsHomepageResponse | null;
  accentColor?: string;
};

export function CmsBenefits({ cms = null, accentColor = "#d6a84f" }: Props) {
  return (
    <section className="relative z-20 -mt-5">
      <div className="luxury-container">
        <div className="grid overflow-hidden rounded-xl bg-white shadow-[0_18px_55px_rgba(0,0,0,.10)] md:grid-cols-4">
          {benefits.map((item, index) => {
            const Icon = item.icon;
            const number = index + 1;
            const titleKey = `home.benefits.item${number}.title`;
            const descKey = `home.benefits.item${number}.desc`;

            const title = getText(cms, titleKey, item.title);
            const desc = getText(cms, descKey, item.desc);

            return (
              <div key={item.title} className="flex items-center justify-center gap-5 border-b border-black/7 px-7 py-6 text-center md:border-b-0 md:border-l">
                <Icon className="shrink-0" style={{ color: accentColor }} size={34} strokeWidth={1.55} />
                <div>
                  <h3 className="text-[17px] font-black">
                    <CmsEditMarker cmsKey={titleKey} sectionKey="home.benefits" label={`مزیت ${number} عنوان`}>
                      {title}
                    </CmsEditMarker>
                  </h3>
                  <p className="mt-2 text-xs text-black/50">
                    <CmsEditMarker cmsKey={descKey} sectionKey="home.benefits" label={`مزیت ${number} توضیح`}>
                      {desc}
                    </CmsEditMarker>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
