import * as Yup from 'yup';

export const strongPasswordField = Yup.string()
  .required('Password is required')
  .trim()
  .min(8, 'At least 8 characters')
  .max(50, 'Must be 50 characters or fewer') 
  .matches(/[a-z]/, 'Include at least 1 lowercase letter')
  .matches(/[A-Z]/, 'Include at least 1 uppercase letter')
  .matches(/\d/, 'Include at least 1 number')
  .matches(/[^A-Za-z0-9]/, 'Include at least 1 symbol')
  .matches(/^\S+$/, 'No spaces allowed');

export const resetPasswordSchema = Yup.object({
  previousPassword: Yup.string().required('Previous password is required'),
  password: strongPasswordField,
  confirmPassword: Yup.string()
    .required('Please confirm your new password')
    .oneOf([Yup.ref('password')], 'New passwords do not match'),
});

