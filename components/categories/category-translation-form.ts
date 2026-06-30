import type { CategoryTranslations } from "@/lib/localization/category-content";
import { parseCategoryTranslations } from "@/lib/localization/category-content";

export type CategoryTranslationFormFields = {
  namePs: string;
  nameFa: string;
};

export const emptyCategoryTranslationFields = (): CategoryTranslationFormFields => ({
  namePs: "",
  nameFa: "",
});

export function buildCategoryTranslationsPayload(
  fields: CategoryTranslationFormFields
): CategoryTranslations | undefined {
  const translations: CategoryTranslations = {};

  if (fields.namePs.trim()) {
    translations.ps = { name: fields.namePs.trim() };
  }
  if (fields.nameFa.trim()) {
    translations["fa-AF"] = { name: fields.nameFa.trim() };
  }

  return Object.keys(translations).length > 0 ? translations : undefined;
}

export function categoryTranslationFieldsFromRecord(
  translations?: CategoryTranslations | null | unknown
): CategoryTranslationFormFields {
  const parsed = parseCategoryTranslations(translations);
  return {
    namePs: parsed?.ps?.name ?? "",
    nameFa: parsed?.["fa-AF"]?.name ?? "",
  };
}
