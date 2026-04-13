import Image from "next/image";

type FooterColumn = {
  title: string;
  links: string[];
};

type FooterContent = {
  tagline: string;
  description: string;
  columns: FooterColumn[];
  copyright: string;
};

interface FooterProps {
  footer: FooterContent;
}

export default function Footer({ footer }: FooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/onlinemandawee-logo.png"
                alt="Mandawee logo"
                width={140}
                height={40}
                className="h-10 w-auto object-contain"
              />
              <div>
                <p className="text-lg font-semibold tracking-tight text-slate-900">
                  Mandawee
                </p>
                <p className="text-sm text-slate-500">
                  {footer.tagline}
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">
              {footer.description}
            </p>
          </div>

          {footer.columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-slate-900">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="transition hover:text-[#C1121F]">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
          {footer.copyright}
        </div>
      </div>
    </footer>
  );
}
