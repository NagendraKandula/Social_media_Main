// frontend/utils/withAuth.tsx
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import apiClient from '../lib/axios';

export function withAuth(gssp: GetServerSideProps): GetServerSideProps {
  return async (context: GetServerSidePropsContext) => {
    const { req } = context;
    const token = req.cookies.access_token;

    if (!token) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    try {
      
      await apiClient.get('/auth/profile', {
        headers: {
          Cookie: `access_token=${token}`,
        },
      });

      return await gssp(context);

    } catch (error) {
      console.error("Authentication failed:", error);
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }
  };
}
