import { ApiErrorResponse } from '@/types';
import toast from 'react-hot-toast';

export const returnErrorMessage = (error: ApiErrorResponse) => {
  const data = error?.response?.data;
  const errorMsg = data?.message;

  // Check for validation errors array (e.g. { errors: [{ field, message }] })
  const validationErrors = (data as any)?.errors;
  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    const messages = validationErrors
      .map((e: { message?: string; field?: string }) => e.message ?? e.field ?? '')
      .filter(Boolean);
    if (messages.length > 0) return messages.join('. ');
  }

  if (Array.isArray(errorMsg)) {
    return errorMsg.join(', ');
  } else if (errorMsg && errorMsg !== 'Validation failed.') {
    return errorMsg;
  } else {
    return 'Something went wrong. Please try again.';
  }
}

export const handleApiError = (error: ApiErrorResponse) => {
  const message = returnErrorMessage(error);
  toast.error(message);
};

