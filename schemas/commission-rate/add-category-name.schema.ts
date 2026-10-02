import * as Yup from 'yup';
import { useTranslations } from 'next-intl';

export const addCategoryNameSchema = (t: ReturnType<typeof useTranslations>) =>
  Yup.object({
    categoryName: Yup.string()
      .required(t('Schemas.addCategoryName.categoryNameRequired'))
      .min(2, t('Schemas.addCategoryName.categoryNameMinLength')),
  });