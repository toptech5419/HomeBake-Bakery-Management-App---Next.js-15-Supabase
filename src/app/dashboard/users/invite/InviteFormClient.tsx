'use client';
import * as React from 'react';
import { generateInviteTokenAction } from '@/actions/auth/qr-actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { QrModal } from '@/components/qr-modal';
import { BackButton } from '@/components/ui/back-button';
import { UserRole } from '@/types';

interface InviteState {
  inviteUrl?: string;
  role?: UserRole;
  error?: string;
}

const initialState: InviteState = {};

export default function InviteFormClient() {
  const [state, setState] = React.useState<InviteState>(initialState);
  const [isPending, setIsPending] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const roleFromState = state?.role || '';

  React.useEffect(() => {
    if (state?.inviteUrl && state?.role) {
      setIsModalOpen(true);
    }
  }, [state]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState(initialState);
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    const role = formData.get('role') as UserRole;
    if (!role) {
      setState({ error: 'Please select a role.' });
      setIsPending(false);
      return;
    }
    try {
      const result = await generateInviteTokenAction(role);
      setState({ inviteUrl: result.inviteUrl, role: result.role });
    } catch (err: unknown) {
      const error = err as Error;
      setState({ error: error.message || 'Failed to generate invite. Please try again.' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="p-4 sm:p-8">
      {/* Back Button */}
      <div className="mb-6">
        <BackButton 
          userRole="owner" 
          fallbackPath="/owner-dashboard"
          showText={true}
          size="md"
          className="mb-4"
        />
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Invite New Staff</h1>
        <p className="text-muted-foreground mt-2">
          Generate a unique QR code to securely onboard a new staff member.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 max-w-sm space-y-6">
        <div>
          <Label className="mb-2 block text-sm font-medium">Select Role</Label>
          <RadioGroup name="role" required className="mt-2 space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manager" id="manager" />
              <Label htmlFor="manager" className="font-normal">
                Manager
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sales_rep" id="sales_rep" />
              <Label htmlFor="sales_rep" className="font-normal">
                Sales Rep
              </Label>
            </div>
          </RadioGroup>
        </div>
        <Button type="submit" className="w-full" loading={isPending} disabled={isPending}>
          {isPending ? 'Generating Invite Code...' : 'Generate Invite Code'}
        </Button>
        {state?.error && (
          <div className="mt-4">
            <p className="text-sm text-destructive">{state.error}</p>
          </div>
        )}
      </form>
      {state?.inviteUrl && roleFromState && (
        <QrModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          inviteUrl={state.inviteUrl}
          role={roleFromState}
        />
      )}
    </div>
  );
} 