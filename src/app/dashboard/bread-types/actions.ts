'use server';
import { 
  createBreadType, 
  updateBreadType, 
  deleteBreadType, 
  deactivateBreadType,
  reactivateBreadType,
  getBreadTypes 
} from '@/lib/bread-types/actions';
import { revalidatePath } from 'next/cache';
import { User } from '@/types/database';

export async function createBreadTypeAction(user: unknown, input: unknown) {
  try {
    await createBreadType(user as User, input as any);
    revalidatePath('/dashboard/bread-types');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to create bread type. Please check your input and try again.' };
  }
}

export async function updateBreadTypeAction(user: unknown, id: string, input: unknown) {
  try {
    await updateBreadType(user as User, id, input as any);
    revalidatePath('/dashboard/bread-types');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update bread type. Please check your input and try again.' };
  }
}

export async function deleteBreadTypeAction(user: unknown, id: string) {
  try {
    await deleteBreadType(user as User, id);
    revalidatePath('/dashboard/bread-types');
    return { success: true };
  } catch (error) {
    console.error('Delete bread type error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete bread type. Please try again.';
    return { success: false, error: errorMessage };
  }
}

export async function refetchBreadTypesAction(includeInactive: boolean = false) {
  try {
    const breadTypes = await getBreadTypes(includeInactive);
    return breadTypes;
  } catch {
    return [];
  }
}

// New server actions for soft delete operations
export async function deactivateBreadTypeAction(user: unknown, id: string) {
  try {
    await deactivateBreadType(user as User, id);
    revalidatePath('/dashboard/bread-types');
    return { success: true };
  } catch (error) {
    console.error('Deactivate bread type error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate bread type. Please try again.';
    return { success: false, error: errorMessage };
  }
}

export async function reactivateBreadTypeAction(user: unknown, id: string) {
  try {
    await reactivateBreadType(user as User, id);
    revalidatePath('/dashboard/bread-types');
    return { success: true };
  } catch (error) {
    console.error('Reactivate bread type error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to reactivate bread type. Please try again.';
    return { success: false, error: errorMessage };
  }
} 