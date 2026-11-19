import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Workout = { title: string; focus?: string; minutes?: number; difficulty?: string; reason?: string };
type LoadState = { suggestions: Workout[] | null; error: string | null };

const userEmail = 'mona@example.com';
const focusLabels: Record<string, string> = {
  endurance: 'Resistência',
  strength: 'Força',
  mobility: 'Mobilidade',
};
const difficultyLabels: Record<string, string> = {
  easy: 'Fácil',
  moderate: 'Moderada',
  hard: 'Avançada',
};

export default function Workouts() {
  const [state, setState] = useState<LoadState>({ suggestions: null, error: null });

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: Workout[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then(({ suggestions }) => {
        if (active) setState({ suggestions, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({ suggestions: null, error: error instanceof Error ? error.message : 'Erro inesperado.' });
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Sugestões de treino</h2>
        {state.error ? (
          <p role="alert">Não foi possível carregar as sugestões de treino. {state.error}</p>
        ) : state.suggestions === null ? (
          <p role="status">Carregando sugestões de treino...</p>
        ) : state.suggestions.length === 0 ? (
          <p>Sem sugestões de treino disponíveis.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {state.suggestions.map((workout, index) => (
              <li className="list-group-item" key={`${workout.title}-${index}`}>
                <h3 className="h5">{workout.title}</h3>
                {workout.focus && <p>Foco: {focusLabels[workout.focus] ?? workout.focus}</p>}
                {workout.minutes !== undefined && <p>Duração: {workout.minutes} min</p>}
                {workout.difficulty && <p>Dificuldade: {difficultyLabels[workout.difficulty] ?? workout.difficulty}</p>}
                {workout.reason && <p>{workout.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
