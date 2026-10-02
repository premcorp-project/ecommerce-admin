import * as Yup from 'yup';

export const productValidationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required').trim(),
    slug: Yup.string().required('Slug is required').trim(),
    description: Yup.string(),
    category: Yup.string().required('Category is required'),
    isFeatured: Yup.boolean(),
});

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}
