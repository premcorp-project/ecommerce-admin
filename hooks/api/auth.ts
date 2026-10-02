import Axios from "@/config/axios";
import { ApiErrorResponse, GetUserDetailsResponse, LoginApiResponse, PostLoginPayload, PostLoginResponse, PostResetPasswordPayload, PostResetPasswordResponse, PostSendLoginOtpPayload, PostSendLoginOtpResponse, PostSendOtpPayload, PostSendOtpResponse, PostVerifyLoginOtpPayload, PostVerifyOtpPayload, PostVerifyOtpResponse, UpdatePasswordRequiredPayload, UpdatePasswordRequiredResponse } from "@/types";
import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from "@tanstack/react-query";

interface Props {
  userId: string;
}

export const useGetUserDetails = (
  { userId }: Props,
  options?: UseQueryOptions<GetUserDetailsResponse>
) => {
  const queryKey = ['getUserDetails', userId]
  return useQuery<GetUserDetailsResponse>({
    queryKey,
    queryFn: async () => {
      const res = await Axios.get<{ data: GetUserDetailsResponse }>(`/user/${userId}`);
      return res.data.data;
    },
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    ...options,
  })
}

// Usage Example In Component 
// const { isLoading, isError, error, data } = useGetUserDetails({
//   userId: id as string,
// }, { staleTime: 50 });


// other mutations/operations like login,forgot password ....

export const usePostLogin = (
  options?: UseMutationOptions<LoginApiResponse, ApiErrorResponse, PostLoginPayload>
) => {
  return useMutation<LoginApiResponse, ApiErrorResponse, PostLoginPayload>({
    mutationFn: async (data) => {
      const res = await Axios.post('/auth/login', data);
      return res.data;
    },
    ...options,
  });
};

export const usePostSendOtp = (
  options?: UseMutationOptions<PostSendOtpResponse, ApiErrorResponse, PostSendOtpPayload>
) => {
  return useMutation<PostSendOtpResponse, ApiErrorResponse, PostSendOtpPayload>({
    mutationFn: async (data) => {
      const res = await Axios.post('/otp/send', data);
      return res.data;
    },
    ...options,
  });
};

export const usePostVerifyOtp = (
  options?: UseMutationOptions<PostVerifyOtpResponse, ApiErrorResponse, PostVerifyOtpPayload>
) => {
  return useMutation<PostVerifyOtpResponse, ApiErrorResponse, PostVerifyOtpPayload>({
    mutationFn: async (data) => {
      const res = await Axios.post('/otp/verify', data);
      return res.data;
    },
    ...options,
  });
};


export const usePostResetPassword = (
  options?: UseMutationOptions<PostResetPasswordResponse, ApiErrorResponse, PostResetPasswordPayload>
) => {
  return useMutation<PostResetPasswordResponse, ApiErrorResponse, PostResetPasswordPayload>({
    mutationFn: async (data) => {
      const res = await Axios.post('/otp/reset-password', data);
      return res.data;
    },
    ...options,
  });
};

export const usePostSendLoginOtp = (
  options?: UseMutationOptions<PostSendLoginOtpResponse, ApiErrorResponse, PostSendLoginOtpPayload>
) => {
  return useMutation<PostSendLoginOtpResponse, ApiErrorResponse, PostSendLoginOtpPayload>({
    mutationFn: async (data) => {
      const res = await Axios.post('/auth/login/admin/email/send-otp', data);
      return res.data;
    },
    ...options,
  });
};


export const usePostVerifyLoginOtp = (
  options?: UseMutationOptions<PostLoginResponse, ApiErrorResponse, PostVerifyLoginOtpPayload>
) => {
  return useMutation<PostLoginResponse, ApiErrorResponse, PostVerifyLoginOtpPayload>({
    mutationFn: async (data) => {
      const res = await Axios.post('/auth/login/admin/email/verify-otp', data);
      return res.data;
    },
    ...options,
  });
};

export const useUpdatePasswordRequired = (
  options?: UseMutationOptions<
    UpdatePasswordRequiredResponse,
    ApiErrorResponse,
    UpdatePasswordRequiredPayload
  >,
) => {
  return useMutation<
    UpdatePasswordRequiredResponse,
    ApiErrorResponse,
    UpdatePasswordRequiredPayload
  >({
    mutationFn: async (payload) => {
      const { data } = await Axios.patch<UpdatePasswordRequiredResponse>(
        '/users/invite/password',
        payload,
      );
      return data;
    },
    ...options,
  });
};