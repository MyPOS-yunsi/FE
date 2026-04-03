'use client';

import { useEffect, useState, useCallback } from 'react';
import { shiftApi, ShiftDto } from '@/lib/api';
import { usePosStore } from '@/store/posStore';

export function useShift() {
  const [shift, setShift] = useState<ShiftDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const setActiveShiftId = usePosStore((s) => s.setActiveShiftId);

  const fetchCurrent = useCallback(async () => {
    try {
      const data = await shiftApi.current();
      setShift(data);
      setActiveShiftId(data?.id ?? null);
    } catch {
      // backend offline => giữ nguyên
    } finally {
      setLoading(false);
    }
  }, [setActiveShiftId]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const openShift = async (startingCash: number) => {
    setError('');
    const s = await shiftApi.open(startingCash);
    setShift(s);
    setActiveShiftId(s.id);
    return s;
  };

  const closeShift = async (endingCash: number) => {
    if (!shift) throw new Error('Không có ca nào đang mở');
    setError('');
    const s = await shiftApi.close(shift.id, endingCash);
    setShift(s);
    setActiveShiftId(null);
    return s;
  };

  return { shift, loading, error, setError, openShift, closeShift, refresh: fetchCurrent };
}
