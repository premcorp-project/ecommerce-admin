import type { FormikContextType, FormikValues } from 'formik';
import { getIn } from 'formik';

export type ErrorStrategy = 'touched' | 'submit' | 'touchedOrSubmit';

export function resolveFormikError(
  formik: FormikContextType<FormikValues> | undefined,
  name: string | undefined,
  strategy: ErrorStrategy
): string | undefined {
  if (!formik || !name) return undefined;

  const touched = Boolean(getIn(formik.touched, name));
  const submitted = (formik.submitCount ?? 0) > 0;

  const visible =
    (strategy === 'touched' && touched) ||
    (strategy === 'submit' && submitted) ||
    (strategy === 'touchedOrSubmit' && (touched || submitted));

  return visible ? (getIn(formik.errors, name) as string | undefined) : undefined;
}
