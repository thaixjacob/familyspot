import { useState } from 'react';

interface Verification {
  placeId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  date: Date;
}

export const useVerification = () => {
  const [loading, setLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addVerification = async (verification: Verification) => {
    setLoading(true);
    try {
      // TODO: Implementar chamada à API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setLoading(false);
    }
  };

  return { loading, addVerification };
};
