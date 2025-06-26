'use server';
import { createBreadType, updateBreadType, deleteBreadType, getBreadTypes } from '@/lib/bread-types/actions';
import { revalidatePath } from 'next/cache';

export async function createBreadTypeAction(user, input) {
  try {
    await createBreadType(user, input);
    revalidatePath('/dashboard/bread-types');
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to create bread type. Please check your input and try again.' };
  }
}

export async function updateBreadTypeAction(user, id, input) {
  try {
    await updateBreadType(user, id, input);
    revalidatePath('/dashboard/bread-types');
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to update bread type. Please check your input and try again.' };
  }
}

export async function deleteBreadTypeAction(user, id) {
  try {
    await deleteBreadType(user, id);
    revalidatePath('/dashboard/bread-types');
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to delete bread type. Please try again.' };
  }
}

export async function refetchBreadTypesAction() {
  try {
    const breadTypes = await getBreadTypes();
    return breadTypes;
  } catch (err) {
    return [];
  }
} 