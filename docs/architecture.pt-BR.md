# Arquitetura da aplicacao

> English version: [architecture.md](architecture.md)

Este documento descreve a arquitetura observada no codigo da aplicacao mobile. O backend possui ciclo de vida e documentacao proprios.

## Principios

1. A interface apresenta conceitos financeiros sem expor complexidade blockchain ao usuario.
2. Autenticacao, assinatura, persistencia local e dados remotos permanecem em camadas separadas.
3. O backend orquestra recursos de negocio; operacoes Stellar que exigem custodia continuam assinadas pelo usuario.
4. Dados obtidos remotamente usam TanStack Query. Estado local persistente usa Zustand.
5. `constants/theme.ts` e a fonte de verdade para tokens visuais compartilhados.

## Camadas

| Camada | Diretorios principais | Responsabilidade |
| --- | --- | --- |
| Rotas | `app/` | Telas, layouts e composicao de fluxos |
| Componentes | `components/ui`, `components/layout`, `components/v2` | UI reutilizavel e estrutura de tela; `components/v2` e o design system V2 |
| Consultas | `lib/queries` | Cache, polling, invalidacao e mutacoes |
| API | `lib/api` | Contratos HTTP e cliente Axios |
| Stellar | `lib/stellar` | Configuracao, assinatura, transferencias e swap |
| Estado local | `lib/stores` | Sessao, modo, preferencias, estado de ramp e cenas pendentes |
| Conteudo | `constants`, `lib/copy` | Tema, flashcards, marcos da trilha e termos de Lite e Pro |

## Provedores e inicializacao

`app/_layout.tsx` inicializa:

- polyfills antes dos SDKs que dependem de APIs web/crypto;
- modo global de audio com `expo-audio`;
- fontes Nunito;
- `PrivyProvider` para autenticacao e carteira embarcada;
- `QueryClientProvider` para estado remoto;
- `AppGate`, que aguarda a hidratacao do Privy e do Zustand antes de redirecionar;
- `NotificationsGate` (push): registro do aparelho depois do login, toque nas notificacoes (so navega quando o `AppGate` deixa de cobrir o app) e a pre-tela de permissao. Handler e canais do Android sao configurados no carregamento do modulo (`lib/notifications/setup.ts`). Nao monta na web.

O token Privy e registrado em `lib/api/token.ts` e anexado pelo cliente HTTP. A funcao de assinatura de hash e registrada em `lib/stellar/signer.ts` para operacoes Stellar.

## Rotas

| Grupo | Rotas | Finalidade |
| --- | --- | --- |
| Autenticacao | `app/(auth)` e `app/oauth/callback.tsx` | Login social, e-mail, passkey e compatibilidade com fluxos de carteira |
| Principal | `app/(tabs)` | Home, Guardar, Carteira, Trilha (com Seu nivel) e Perfil |
| Licao | `app/learning/[moduleKey].tsx` | Licao da Trilha V2, por cima das abas |
| Vault | `app/vault/[id]` | Detalhe, deposito e saque |
| Etherfuse | `app/(etherfuse-onboarding)` | Cadastro, KYC, documentos, termos e conta bancaria |
| Conteudo | `app/education.tsx`, `app/pigs.tsx` | Educacao e evolucao do mascote |

## Estado e persistencia

| Store | Persistencia | Conteudo |
| --- | --- | --- |
| `auth.store.ts` | AsyncStorage | IDs publicos da sessao, carteira, ativacao e nivel visual visto |
| `app-mode.store.ts` | AsyncStorage | Modo Lite/Pro e data da ultima troca, conciliados com o backend |
| `contacts.store.ts` | AsyncStorage | Contatos salvos do envio por @ (so @ e nome), por conta; apagados ao sair |
| `level-up.store.ts`, `piggy-unlock.store.ts` | Memoria | Cena de subida de nivel e de porquinho liberado pedida e ainda nao vista |
| `settings.store.ts` | AsyncStorage | Preferencias como audio silenciado |
| `notifications.store.ts` | AsyncStorage (so se a pre-tela ja teve resposta) | Permissao de push e rota pendente de uma notificacao tocada; o ultimo registro do aparelho fica no SecureStore e e apagado na saida e na exclusao da conta |
| `etherfuse.store.ts` | Conforme implementacao do fluxo | Estado de navegacao do onboarding/ramp |
| `pix.store.ts`, `ui.store.ts` | Estado de interface | Dados temporarios de apresentacao e fluxo |

XP, nivel e progresso das licoes nao ficam no aparelho: vem do backend (`lib/api/experience.ts`, `lib/api/learning.ts`). O progresso local da trilha v1 foi removido; a chave antiga e apagada ao sair e na exclusao de conta.

AsyncStorage nao e um cofre. Tokens, documentos, chaves privadas e segredos nao devem ser adicionados a essas stores.

## Dados remotos

O fluxo padrao e:

```text
Tela -> hook em lib/queries -> funcao em lib/api -> backend
```

As queries definem chaves de cache por dominio. Depositos e saques em estados intermediarios sao consultados novamente a cada cinco segundos ate `CONFIRMED` ou `FAILED`. Mutacoes invalidam as listas relacionadas apos sucesso.

Erros da API sao lidos pelo `code` em `lib/api/errors.ts` (`readApiError`, `hasApiErrorCode`, `apiErrorDetails`). As consultas do PigFi Experience sao por conta (`contractId`) e ficam em `lib/queries/experience.queries.ts` e `learning.queries.ts`; `refreshVaultAccess` rele o acesso dos vaults depois de uma licao ou de um 409.

## Operacoes Stellar

- **Ativacao:** o backend prepara a operacao; o app assina e envia a resposta.
- **Deposito/saque de vault:** o backend gera XDR sem assinatura; o usuario assina pelo fluxo de carteira; o backend submete ou reconcilia.
- **Envio por @ (USDC, EURC e XLM):** o backend so resolve o @ para o endereco; o app confere destino e saldo na rede, assina com o Privy (`buildSignedPayment`) e envia ao Horizon (`submitSignedPayment`), conferindo pelo hash antes de dar erro de rede.
- **Transferencia USDC:** o app valida conta, trustline, saldo e memo, monta a transacao, solicita assinatura Privy e envia ao Horizon.
- **Historico Stellar:** pagamentos USDC sao consultados no Horizon e combinados com operacoes do backend na interface.
- **Swap:** `lib/stellar/swap.ts` oferece descoberta de caminho e troca XLM/USDC para fluxos que necessitem do ativo.

Valores de contrato com sete casas atomicas sao normalizados em `lib/api/vaults.ts` antes de chegar a interface. `dfTokens` permanece no formato bruto porque representa shares usadas no saque.

## Limites de responsabilidade

O app nao deve:

- armazenar chaves privadas ou credenciais de servidor;
- implementar regras de negocio que precisam ser autoritativas no backend;
- assumir que uma mutacao assincrona foi confirmada antes do status remoto;
- duplicar contratos HTTP diretamente dentro de telas.

O backend nao deve receber chaves privadas. Ele pode preparar XDRs sem assinatura, validar regras, persistir intencoes e reconciliar transacoes.
