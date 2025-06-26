'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteUrl: string;
  role: string;
}

export function QrModal({ isOpen, onClose, inviteUrl, role }: QrModalProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && canvasRef.current && inviteUrl) {
      QRCode.toCanvas(canvasRef.current, inviteUrl, {
        width: 256,
        margin: 2,
        errorCorrectionLevel: 'H',
      });
    }
  }, [isOpen, inviteUrl]);

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const windowContent = `
        <!DOCTYPE html>
        <html>
          <head><title>Print QR Code</title></head>
          <body style="text-align: center; margin-top: 50px;">
            <h2>HomeBake Invitation</h2>
            <p>Scan this QR code to sign up as a ${role}.</p>
            <img src="${dataUrl}" alt="Invitation QR Code" />
          </body>
        </html>
      `;
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(windowContent);
      printWindow?.document.close();
      printWindow?.focus();
      printWindow?.print();
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite New Staff">
      <div className="flex flex-col items-center justify-center space-y-4 w-full max-w-xs sm:max-w-sm mx-auto p-2">
        <p className="text-center text-muted-foreground">
          Ask the new staff member to scan this QR code with their phone to create their account.
        </p>
        <canvas ref={canvasRef} className="max-w-full h-auto" />
        <p className="font-semibold">
          Role: <span className="font-normal capitalize">{role.replace('_', ' ')}</span>
        </p>
        <div className="w-full flex flex-col items-center space-y-2 pt-2">
          <Input
            value={inviteUrl}
            readOnly
            className="w-full text-xs cursor-pointer break-all"
            onClick={handleCopy}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>
        <div className="flex w-full flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
          <Button className="w-full" onClick={handlePrint}>
            Print
          </Button>
        </div>
      </div>
    </Modal>
  );
} 