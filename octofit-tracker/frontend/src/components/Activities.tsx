import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Activity = { _id?: string; type: string; minutes: number; points: number };
type LoadState = { activities: Activity[] | null; error: string | null };

const activityLabels: Record<string, string> = {
  run: 'Corrida',
  cycle: 'Ciclismo',
  strength: 'Treino de força',
  walk: 'Caminhada',
};

export default function Activities() {
  const [state, setState] = useState<LoadState>({ activities: null, error: null });

  useEffect(() => {
    let active = true;
    getJson<{ activities: Activity[] }>('/api/activities')
      .then(({ activities }) => {
        if (active) setState({ activities, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({ activities: null, error: error instanceof Error ? error.message : 'Erro inesperado.' });
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Atividades</h2>
        {state.error ? (
          <p role="alert">Não foi possível carregar as atividades. {state.error}</p>
        ) : state.activities === null ? (
          <p role="status">Carregando atividades...</p>
        ) : state.activities.length === 0 ? (
          <p>Sem atividades registradas.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {state.activities.map((activity, index) => (
              <li className="list-group-item" key={activity._id ?? `${activity.type}-${index}`}>
                <strong>{activityLabels[activity.type] ?? activity.type}</strong>
                <span className="ms-2">{activity.minutes} min · {activity.points} pontos</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
