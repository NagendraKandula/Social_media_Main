// frontend/utils/withAuth.tsx
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import axios from 'axios';

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
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      // 👈 Change 3: Make a direct request to the full Render URL
      await axios.get(`${backendUrl}/auth/profile`, {
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
