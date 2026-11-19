# Arquitetura do OctoFit Tracker

O OctoFit Tracker é uma aplicação de três camadas para um programa de atividades físicas escolar. O código inicial inclui contratos de API e pontos de implementação intencionalmente incompletos para que você use o modo agent do GitHub Copilot em um ciclo guiado por testes.

```mermaid
flowchart LR
    Browser["Navegador"]
    UI["Apresentação<br/>React 19 · Vite · React Router · Bootstrap<br/>Porta 3000 · pública"]
    API["Lógica<br/>Express · TypeScript · serviços<br/>Porta 8000 · pública"]
    DB["Dados<br/>Mongoose · MongoDB<br/>Porta 27017 · privada"]
    Contracts["Contratos executáveis<br/>Atividades · Equipes · Placar · Sugestões"]

    Browser --> UI
    UI -->|HTTP /api via proxy Vite| API
    API -->|Mongoose| DB
    Contracts -. verificam .-> UI
    Contracts -. verificam .-> API
    Contracts -. verificam .-> DB
```

## Limites entre as camadas

- **Camada de apresentação**: React 19, Vite, React Router, Bootstrap e um cliente compartilhado da API em `octofit-tracker/frontend/src`.
- **Camada de lógica**: rotas e serviços Express com TypeScript em `octofit-tracker/backend/src` expõem o comportamento `/api/*` na porta `8000`.
- **Camada de dados**: modelos Mongoose e dados de demonstração em `octofit-tracker/backend/src/models` e `src/scripts/seed.ts` são persistidos no MongoDB na porta `27017`.

## Portas e regras de ambiente

- MongoDB: `27017` (privada)
- API Express: `8000` (pública)
- Interface Vite: `3000` (pública)
- O navegador acessa caminhos relativos `/api`. O Vite os encaminha para `http://localhost:8000`; `VITE_API_BASE_URL` pode substituir a URL-base.
- Não encaminhe nem torne públicas outras portas.

## Contrato da API

| Capacidade | Método e caminho | Comportamento esperado |
| --- | --- | --- |
| Registro de atividades | `GET /api/activities`, `POST /api/activities` | Lista e cria atividades válidas. POST recebe `userId`, `teamId`, `type` e `minutes`; `userId` e `teamId` devem ser IDs bem-formados de uma pessoa e uma equipe existentes, caso contrário a API retorna um 4xx intencional (nunca um 500 causado por erro de conversão). Uma atividade criada armazena `user`, `team`, `type` e `minutes` enviados, além de `points` e `occurredAt` calculados. |
| Equipes | `GET /api/teams`, `POST /api/teams` | Lista e cria equipes com integrantes. As equipes criadas e listadas mantêm os valores enviados em `name` e `mascot`. Rejeita uma equipe sem nome com `400`. |
| Placar | `GET /api/leaderboard` | Retorna as equipes ordenadas pela soma dos pontos de suas atividades, da maior para a menor. Cada item contém `teamName`, `totalPoints` e uma `rank` iniciada em 1. |
| Sugestões de treino | `GET /api/workouts/suggestions/:userEmail` | Recomenda treinos com base nos padrões de atividade recentes da pessoa correspondente ao e-mail seed. O foco da primeira sugestão (`focus`) corresponde à meta ou à atividade recente dessa pessoa, e o campo `reason` explica o motivo. Um e-mail sem pessoa correspondente retorna um 4xx intencional (por exemplo, `404`). |

## Decisões de implementação

- Decisão da camada de apresentação: manter componentes React por capacidade e usar `src/api/client.ts` para chamadas; cada tela deve apresentar carregamento, vazio, sucesso e erro acessíveis em português.
- Decisão da camada de lógica: manter rotas Express finas e concentrar validação de entrada e regras de negócio em funções de serviço, respondendo com 4xx intencionais para entradas ou referências inválidas.
- Decisão da camada de dados: declarar campos obrigatórios e restrições nos esquemas Mongoose; manter a criação de dados de demonstração idempotente por upsert, sem apagar registros existentes.
- Abordagem para registro de atividades: validar tipo, duração e IDs antes de consultar referências; exigir pessoa e equipe existentes, calcular pontos e data no serviço e persistir as referências como ObjectIds.
- Abordagem para gerenciamento de equipes: exigir nome e mascote no modelo, manter `members` como lista de referências e validar as referências ao criar equipes.
- Abordagem para o placar: agregar os pontos das atividades por equipe, ordenar do maior total para o menor e atribuir posições começando em 1.
- Abordagem para sugestões de treino: localizar a pessoa pelo e-mail, usar meta e atividade recente para ordenar os treinos compatíveis e explicar a recomendação; retornar 4xx para e-mail sem correspondência.

## Ordem segura de implementação

1. Completar e validar os esquemas Mongoose; confirmar os contratos de dados e a idempotência do seed.
2. Implementar os serviços de atividades e equipes com validação e referências; em seguida, placar e sugestões.
3. Executar os testes de contrato do backend e corrigir as regressões antes de alterar a apresentação.
4. Implementar os estados e a renderização dos componentes React usando o cliente de API compartilhado; executar os testes do frontend.
5. Executar as compilações das duas camadas e repetir as suítes relevantes.

## Plano de testes

Linha de base registrada antes da implementação, com MongoDB em execução:

- `npm test --prefix octofit-tracker/backend`: **8 falhas e 1 aprovação em 9 testes**. Quatro falhas são validações ausentes nos modelos; as quatro da API indicam criação ainda não implementada (resposta 501), placar vazio e sugestão incompatível com o padrão de atividade.
- `npm test --prefix octofit-tracker/frontend`: **15 falhas em 15 testes**. As telas ainda exibem implementação pendente e não oferecem os dados, estados de carregamento/vazio/erro ou a requisição de sugestões esperados pelo contrato.

Após cada etapa, verificar os contratos específicos e, ao concluir, executar:

- Testes da camada de dados: `npm run test:data --prefix octofit-tracker/backend`
- Testes da API: `npm run test:api --prefix octofit-tracker/backend`
- Testes do frontend: `npm test --prefix octofit-tracker/frontend`
- Compilação do backend: `npm run build --prefix octofit-tracker/backend`
- Compilação do frontend: `npm run build --prefix octofit-tracker/frontend`
