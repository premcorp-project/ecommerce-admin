import * as Yup from 'yup';

export const loginSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string().min(8).max(50).required('Password is required'),
  remember: Yup.boolean().optional(),
});

