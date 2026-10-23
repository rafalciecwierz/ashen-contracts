import { redirect } from 'next/navigation';
import { AppPaths } from '@/routes/routes';
import { getCurrentUser } from '@/http/server';
import { RegisterForm } from './_components/registerForm.component';

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(AppPaths.play);

  return <RegisterForm />;
}
