import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { name: string; mascot?: string; members?: unknown[] };
type LoadState = { teams: Team[] | null; error: string | null };

export default function Teams() {
  const [state, setState] = useState<LoadState>({ teams: null, error: null });

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams }) => {
        if (active) setState({ teams, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({ teams: null, error: error instanceof Error ? error.message : 'Erro inesperado.' });
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Equipes</h2>
        {state.error ? (
          <p role="alert">Não foi possível carregar as equipes. {state.error}</p>
        ) : state.teams === null ? (
          <p role="status">Carregando equipes...</p>
        ) : state.teams.length === 0 ? (
          <p>Sem equipes cadastradas.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {state.teams.map((team) => (
              <li className="list-group-item" key={team.name}>
                <strong>{team.name}</strong>
                {team.mascot && <span className="ms-2">Mascote: {team.mascot}</span>}
                <p className="mb-0">{team.members?.length ?? 0} integrantes</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
