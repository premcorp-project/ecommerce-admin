/**
 * Home page — app/page.tsx
 *
 * This is an admin-only app. Visiting `/` shows the login screen.
 * Already-authorized admin/staff are redirected to the admin area
 * (handled inside LoginContent).
 */

import LoginContent from '@/components/auth/LoginContent';

export default function HomePage() {
  return <LoginContent />;
}
