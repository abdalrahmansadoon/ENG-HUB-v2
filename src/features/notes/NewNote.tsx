import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../data/context';

/** يحجز معرفاً لملاحظة جديدة. لا تُحفظ حتى يكتب العضو شيئاً. */
export default function NewNote() {
  const store = useStore();
  const [params] = useSearchParams();
  const [id] = useState(() => store.newId());
  return <Navigate to={`/notes/${id}`} replace state={{ fresh: { subjectId: params.get('subject') ?? '', itemId: params.get('item') ?? '' } }} />;
}
