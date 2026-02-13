import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseQuery(table, {
  select = '*',
  filters = {},
  orderBy = null,
  transform = null,
  enabled = true,
} = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filtersKey = JSON.stringify(filters);
  const orderByKey = JSON.stringify(orderBy);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    let query = supabase.from(table).select(select);

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    const { data: rows, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setData(transform ? rows.map(transform) : rows);
    setLoading(false);
  }, [table, select, filtersKey, orderByKey, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useSupabaseSingle(table, {
  match = {},
  transform = null,
  enabled = true,
} = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const matchKey = JSON.stringify(match);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    let query = supabase.from(table).select('*');

    Object.entries(match).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data: row, error: fetchError } = await query.single();

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setData(transform ? transform(row) : row);
    setLoading(false);
  }, [table, matchKey, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
