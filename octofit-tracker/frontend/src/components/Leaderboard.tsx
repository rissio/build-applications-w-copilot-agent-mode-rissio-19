import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };
type LoadState = { leaderboard: LeaderboardEntry[] | null; error: string | null };

export default function Leaderboard() {
  const [state, setState] = useState<LoadState>({ leaderboard: null, error: null });

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then(({ leaderboard }) => {
        if (active) setState({ leaderboard, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({ leaderboard: null, error: error instanceof Error ? error.message : 'Erro inesperado.' });
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Placar</h2>
        {state.error ? (
          <p role="alert">Não foi possível carregar o placar. {state.error}</p>
        ) : state.leaderboard === null ? (
          <p role="status">Carregando placar...</p>
        ) : state.leaderboard.length === 0 ? (
          <p>Sem classificação disponível.</p>
        ) : (
          <ol className="list-group list-group-numbered">
            {state.leaderboard.map((entry) => (
              <li className="list-group-item d-flex justify-content-between" key={entry.teamName}>
                <span>{entry.teamName}</span>
                <strong>{entry.totalPoints} pontos</strong>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
