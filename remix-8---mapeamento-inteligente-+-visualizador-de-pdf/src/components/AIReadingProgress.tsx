import { useEffect, useState } from 'react';
import { readingStage, type AIReadingJob } from '../utils/aiJobs';

export function ReadingElapsedTime({startedAt}: {startedAt: string}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [startedAt]);
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)) || 0;
  return <p>Tempo decorrido: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p>;
}
export function AIReadingProgress({ job }: { job: AIReadingJob }) {
  return <div className="ai-reading-progress"><strong>{readingStage(job)}…</strong><ReadingElapsedTime startedAt={job.started_at || job.created_at}/>{job.progress?.stage === 'retrying' && <small>O serviço demorou ou ficou indisponível. A próxima tentativa usa o mesmo arquivo.</small>}{job.status === 'saving' && job.error && <small>{job.error}</small>}</div>;
}
