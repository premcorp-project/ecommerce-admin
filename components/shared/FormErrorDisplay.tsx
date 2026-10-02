'use client';

import { FormikErrors, FormikTouched } from 'formik';
import { AlertCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FormErrorDisplayProps {
  formikErrors?: FormikErrors<unknown>;
  apiError?: string | string[] | null;
  apiErrorTitle?: string;
  apiErrorSummary?: string;
  touched?: FormikTouched<unknown>;
}

export function FormErrorDisplay({
  formikErrors,
  apiError,
  apiErrorTitle,
  apiErrorSummary,
  touched,
}: FormErrorDisplayProps) {
  // Get all validation errors
  const validationErrors: string[] = [];
  
  if (formikErrors && touched) {
    const collectErrors = (
      errors: FormikErrors<unknown>, 
      touchedFields: FormikTouched<unknown>, 
      prefix = ''
    ) => {
      Object.entries(errors).forEach(([key, value]) => {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        const isTouched = touchedFields[key as keyof typeof touchedFields];
        
        if (typeof value === 'string' && isTouched) {
          validationErrors.push(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          collectErrors(
            value as FormikErrors<unknown>,
            (touchedFields[key as keyof typeof touchedFields] as FormikTouched<unknown>) || {},
            fieldPath
          );
        }
      });
    };

    collectErrors(formikErrors, touched);
  }

  // Don't render if no errors
  if (!apiError && validationErrors.length === 0) {
    return null;
  }

  const apiErrorItems = Array.isArray(apiError)
    ? apiError.filter((item) => Boolean(item?.trim()))
    : typeof apiError === 'string' && apiError.trim().length > 0
      ? [apiError]
      : [];

  return (
    <div className="space-y-3">
      {/* API Error */}
      {apiErrorItems.length > 0 && (
        <Alert variant="destructive" className="border-destructive/50">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{apiErrorTitle || 'Submission Failed'}</AlertTitle>
          <AlertDescription>
            {apiErrorSummary && <p className="mb-2">{apiErrorSummary}</p>}
            {apiErrorItems.length === 1 ? (
              <p>{apiErrorItems[0]}</p>
            ) : (
              <ul className="list-disc list-inside space-y-1 mt-2">
                {apiErrorItems.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            Please fix the following {validationErrors.length}{' '}
            {validationErrors.length === 1 ? 'error' : 'errors'}:
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">
                  {error}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
