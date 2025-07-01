'use server';
import { createBreadType, updateBreadType, deleteBreadType, getBreadTypes } from '@/lib/bread-types/actions';
import { revalidatePath } from 'next/cache';

export async function createBreadTypeAction(user: any, input: any) {
  try {
    await createBreadType(user, input);
    revalidatePath('/dashboard/bread-types');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to create bread type. Please check your input and try again.' };
  }
}

export async function updateBreadTypeAction(user: any, id: string, input: any) {
  try {
    await updateBreadType(user, id, input);
    revalidatePath('/dashboard/bread-types');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update bread type. Please check your input and try again.' };
  }
}

export async function deleteBreadTypeAction(user: any, id: string) {
  try {
    await deleteBreadType(user, id);
    revalidatePath('/dashboard/bread-types');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete bread type. Please try again.' };
  }
}

export async function refetchBreadTypesAction() {
  try {
    const breadTypes = await getBreadTypes();
    return breadTypes;
  } catch {
    return [];
  }
} 