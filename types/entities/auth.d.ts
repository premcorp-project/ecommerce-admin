export type AdminProfileKey = 'Admin';

export interface AdminProfile {
  key: AdminProfileKey;
  data: {
    id: string;
    type?: string;
    user_profile_id?: string;
  } & Record<string, unknown>;
}
