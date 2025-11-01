import React from 'react';

const ThreadsConnect: React.FC = () => {
  const THREADS_APP_ID = process.env.NEXT_PUBLIC_THREADS_APP_ID!;
  const REDIRECT_URI = 'https://unsecretive-unlearned-alexzander.ngrok-free.dev/threads/callback';
  const SCOPES = ['threads_basic', 'threads_content_publish'];

  const handleConnect = () => {
    const authUrl = new URL('https://www.threads.net/oauth/authorize');
    authUrl.searchParams.set('client_id', THREADS_APP_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES.join(','));
    authUrl.searchParams.set('response_type', 'code');
    // optional: add your own CSRF protection state
    authUrl.searchParams.set('state', crypto.randomUUID());

    window.location.href = authUrl.toString();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <h1 className="text-2xl font-bold">Connect your Threads account</h1>
      <button
        onClick={handleConnect}
        className="bg-black text-white px-6 py-3 rounded-xl hover:opacity-80"
      >
        Continue with Threads
      </button>
    </div>
  );
};

export default ThreadsConnect;