export type ContentSubsection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type ContentSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  subsections?: ContentSubsection[];
};

export type ContentRelatedLink = {
  href: string;
  label: string;
};

export type ContentPageDefinition = {
  slug: string;
  title: string;
  subtitle: string;
  badge?: string;
  sections: ContentSection[];
  relatedLinks?: ContentRelatedLink[];
  showTableOfContents?: boolean;
  showContactBlock?: boolean;
  showLanguageNotice?: boolean;
};
