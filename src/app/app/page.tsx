import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/server/actions/user/get-current-user.action';

export default async function AppPage() {
  const result = await getCurrentUser();

  if (!result.authenticated) {
    redirect('/login');
  }

  const user = result.user;

  if (!user || !user.profileType) {
    redirect('/escolher-perfil');
  }

  if (user.profileType === 'producer') {
    redirect('/produtor/dashboard');
  } else {
    redirect('/receptor/dashboard');
  }

  return null;
}
