'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Copy, ExternalLink } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteUrl: string;
  role: string;
}

export function QrModal({ isOpen, onClose, inviteUrl, role }: QrModalProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'HomeBake Invitation',
          text: `You've been invited to join HomeBake as a ${role.replace('_', ' ')}`,
          url: inviteUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  const handleOpenLink = () => {
    window.open(inviteUrl, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite New Staff">
      <div className="space-y-6 w-full max-w-md mx-auto">
        <Card variant="filled">
          <CardHeader>
            <CardTitle size="sm" className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-orange-500" />
              Staff Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="bg-orange-100 rounded-lg p-6">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm text-gray-600">
                  Share this invitation link with the new staff member
                </p>
              </div>
              
              <div className="text-left space-y-2">
                <p className="text-sm font-medium text-gray-700">Role:</p>
                <p className="text-orange-600 font-semibold capitalize">
                  {role.replace('_', ' ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Invitation Link:
          </label>
          <div className="flex gap-2">
            <Input
              value={inviteUrl}
              readOnly
              className="flex-1 text-xs"
              placeholder="Invitation URL"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title="Copy link"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          
          {copied && (
            <p className="text-sm text-green-600 text-center">
              ✓ Link copied to clipboard!
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={onClose}
          >
            Close
          </Button>
          <Button 
            variant="secondary" 
            className="flex-1" 
            onClick={handleOpenLink}
            leftIcon={<ExternalLink className="w-4 h-4" />}
          >
            Open Link
          </Button>
          <Button 
            variant="primary" 
            className="flex-1" 
            onClick={handleShare}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            {typeof navigator !== 'undefined' && 'share' in navigator ? 'Share' : 'Copy'}
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center p-4 bg-gray-50 rounded-lg">
          <p>
            <strong>Instructions:</strong> Send this link to the new staff member. 
            They can open it on any device to create their account and join your bakery team.
          </p>
        </div>
      </div>
    </Modal>
  );
} 