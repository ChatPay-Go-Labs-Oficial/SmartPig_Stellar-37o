# Revisão de segurança da branch game — 25/09/2026

## Decisão

**PR em rascunho: não aprovar merge ou deploy enquanto os bloqueios abaixo estiverem abertos.** Esta é uma revisão dos arquivos e integrações alterados, com auditoria automatizada de dependências e segredos. Não é uma auditoria independente de todo o produto nem garantia de ausência de vulnerabilidades.

## Dependências

`npm audit` final: **0 críticas, 4 altas, 38 moderadas e 0 baixas**, total 42 nós sinalizados. A contagem inclui dependências afetadas indiretamente; não equivale ao número de falhas independentes.

O resultado inicial era 63 nós sinalizados (1 crítico, 18 altos). Atualizações compatíveis e overrides de postcss 8, brace-expansion 1 e ws 8 removeram o alerta crítico e reduziram os demais. Não houve migração major de Expo, React Native ou SDK Stellar.

Pacotes com advisories diretos ainda encontrados:

| Pacote | Severidade | Referência de correção |
|---|---|---|
| axios | high | [advisory](https://github.com/advisories/GHSA-f4gw-2p7v-4548), [advisory](https://github.com/advisories/GHSA-42h9-826w-cgv3) |
| decode-uri-component | moderate | [advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) |
| image-size | high | [advisory](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [advisory](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) |
| toml | high | [advisory](https://github.com/advisories/GHSA-82x6-q7mm-w9cf), [advisory](https://github.com/advisories/GHSA-v5mp-jgw5-2x6j) |
| uuid | moderate | [advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |

O SDK Stellar 15.1.0 mantém axios 1.15.0 e toml 3.0.0 na árvore. A recomendação automática envolve upgrade major do SDK. No app também há image-size, decode-uri-component e uuid antigos em cadeias de Expo e autenticação/wallets. Resolver com atualização compatível dos consumidores ou migração planejada, validar assinatura/serialização, integração e build dos ambientes usados e repetir a auditoria. Não foi usado `npm audit fix --force`. Não mascarar essas ocorrências com allowlist de vulnerabilidades.

## Segredos

Gitleaks 8.30.1, obtido do release oficial com checksum SHA-256 conferido, examinou snapshot de todos os arquivos versionados e novos não ignorados. Os nove alertas foram examinados: dois endereços públicos de contratos Stellar em `.env.example` do app e sete UUIDs de idempotência em exemplos Swagger do backend. Não eram credenciais. Uma varredura adicional de seeds Stellar com validação de checksum não encontrou nenhuma seed válida. Arquivos `.env` reais e diretórios ignorados não entram no commit.

## Revisão de código

- Progresso vem do backend; o cliente não concede pontos nem envia identidade como autoridade para recompensas.
- Cache de progresso e catálogo separado por usuário; modal educacional fecha na troca de identidade.
- Estados de pausa e elegibilidade aparecem na UI; validação financeira precisa permanecer no backend.
- Limpeza dos warnings de lint nos arquivos alterados.

## Validação

- `npm ci --ignore-scripts` concluído; `npm run postinstall` aplicou o patch existente de react-native-screens 4.16.0.
- `npx tsc --noEmit` aprovado.
- ESLint dos nove arquivos TypeScript alterados: zero erros e zero warnings.
- Sem build nativo/dispositivo, teste de assinatura com fundos, swap, deploy ou publicação nas lojas.

## Bloqueios adicionais de lançamento

Publicar o backend e sua migração antes deste app. Fluxos financeiros ainda têm componentes específicos de USDC; a interface não deve ser usada para habilitar depósitos EURC/XLM antes de concluir o PRD. Validar Android/iOS, login Privy, assinatura e dependências de autenticação após as atualizações. Não embutir chave administrativa para contornar a proteção do backend. A revisão não auditou integralmente os demais fluxos do app.
