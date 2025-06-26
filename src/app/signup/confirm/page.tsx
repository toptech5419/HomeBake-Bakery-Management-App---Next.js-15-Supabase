import Link from 'next/link';

export default function SignupConfirmPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-lg border p-8 text-center shadow-lg">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-4 text-muted-foreground">
          We&apos;ve sent a confirmation link to your email address. Please click the
          link to complete your registration and log in.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Once confirmed, you can close this tab and{' '}
          <Link href="/login" className="font-semibold text-primary underline">
            log in
          </Link>
          .
        </p>
      </div>
    </main>
  );
} 