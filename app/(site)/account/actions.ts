'use server';

import { revalidatePath } from 'next/cache';
import { getSessionContext } from '@/lib/auth';
import { cleanText } from '@/lib/validation';

export async function updateProfileName(formData: FormData): Promise<void> {
  const context = await getSessionContext();
  if (!context) return;
  const fullName = cleanText(formData.get('full_name'), 160);
  if (fullName.length < 2) return;
  await context.supabase.from('profiles').update({ full_name: fullName }).eq('id', context.user.id);
  revalidatePath('/account');
}
