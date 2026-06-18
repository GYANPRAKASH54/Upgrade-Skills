import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export const revalidate = 0;

export const metadata = {
  title: 'Edit Profile',
  description: 'Manage your profile details and settings.',
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/profile');
  }

  // Fetch freshest details directly from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      headline: true,
    },
  });

  if (!user) {
    redirect('/auth/signin');
  }

  return <ProfileClient initialUser={user} />;
}
