# Funcionalidades e fluxos

> English version: [features-and-flows.md](features-and-flows.md)

## Evolucao recente

As implementacoes mais recentes incorporadas ate 26 de junho de 2026 incluem:

- login social com Google, e-mail OTP e passkey via Privy;
- bloqueio local por biometria ao abrir o app e ao retornar do segundo plano;
- progresso educacional por usuario (hoje no backend);
- transferencia direta de USDC com validacao de conta e trustline;
- historico com transferencias Stellar e estados de deposito/saque;
- trilha com player de licoes, feedback, XP e sons;
- migracao de audio para `expo-audio`;
- redesign de perfil, historico e modais financeiros;
- polling e invalidacao de cache para operacoes pendentes;
- normalizacao de saldos Stellar e exibicao de valores investidos.

Em outubro de 2026 entrou o **PigFi Experience**: nivel de usuario e XP vindos do backend, recompensa do dia, a Trilha V2 com licoes servidas pelo backend e a liberacao dos porquinhos pela trilha no modo Lite.

## Autenticacao e carteira

1. O usuario autentica com Google, codigo enviado por e-mail ou passkey.
2. O Privy restaura ou cria a carteira Stellar embarcada.
3. O app autentica o endereco publico no backend.
4. IDs publicos da sessao e da conta sao persistidos localmente.
5. Em sessoes ja autenticadas, o app exige biometria local ao abrir e ao retornar do segundo plano quando o aparelho possui biometria cadastrada.
6. Quando necessario, o app solicita e assina a ativacao da smart account.

As telas antigas de criacao/conexao de carteira continuam no grupo de autenticacao para compatibilidade, mas o fluxo principal atual e orientado pelo Privy.

## Vaults, deposito e saque

- A aba **Investir** lista vaults retornados pelo backend.
- O detalhe consulta informacoes, APY e saldo da carteira.
- Depositos e saques criam intencoes idempotentes no backend.
- Saques exigem biometria local antes de criar a intencao quando o aparelho possui biometria cadastrada.
- XDRs retornados sao assinados no cliente sem compartilhar chave privada.
- Operacoes intermediarias recebem polling enquanto aguardam confirmacao.
- Saldos subjacentes sao convertidos de unidades atomicas Stellar; shares de saque permanecem brutas.

## Transferencias USDC

O modal de transferencia:

- valida endereco Stellar e impede transferencia para a propria conta;
- aceita ate sete casas decimais;
- limita memo textual a 28 bytes;
- verifica existencia da conta, trustline autorizada e limite disponivel;
- verifica saldo USDC e reserva/taxa XLM;
- assina com a carteira Privy e submete ao Horizon;
- traduz erros de rede e codigos Stellar em mensagens amigaveis.

## Historico

A tela de historico apresenta operacoes Pix, depositos e saques de vaults e transferencias USDC. Estados transitorios e finais devem ser exibidos de forma consistente, sem tratar uma submissao como confirmacao.

## PigFi Experience: nivel, trilha e porquinhos

O backend e a fonte de verdade de XP, nivel, progresso das licoes e acesso aos porquinhos. O app nao guarda progresso educacional no aparelho.

**Modo Lite e Pro.** O modo e da conta: `GET /users/me` em todo inicio de sessao concilia o modo do aparelho com o do backend por "quem mudou por ultimo" (`hooks/use-experience-mode-sync.ts`). A troca nas Preferencias vai ao backend em fila. Sair da conta devolve o modo ao padrao.

**Nivel de Usuario.** Card na Home, tela Seu nivel (`app/(tabs)/learn/level.tsx`) e nivel no Perfil. A recompensa do dia da XP uma vez por dia; `409 DAILY_REWARD_ALREADY_CLAIMED` recarrega o perfil e mostra a recompensa como recebida, sem erro. XP so vem da recompensa do dia, da licao concluida e do modulo concluido: nenhuma acao com dinheiro da XP.

**Trilha V2.** `app/(tabs)/learn/index.tsx` mostra o caminho das licoes (`GET /learning/modules` e `GET /learning/content`), os marcos de liberacao no Lite (`constants/learning-trail.ts`) e o Dicionario. A licao abre em `app/learning/[moduleKey].tsx`, por cima das abas, retoma do ponto salvo (`GET /learning/progress`) e grava cada resposta no backend. `409 LEARNING_CONTENT_VERSION_STALE` recarrega a licao e mantem o passo.

**Subida de nivel.** Quando a resposta que conclui a licao, ou a recompensa do dia, traz um nivel novo, a cena Evolucao! aparece por cima das abas (`LevelUpScene`). A subida chega uma vez, na resposta que a causou; nada fica guardado.

**Elegibilidade dos porquinhos.** Cada vault traz um `access` calculado pelo backend. No Lite, guardar num porquinho pode exigir licoes da trilha:

- o porquinho bloqueado continua visivel na Guardar, na Home e na Carteira, com o cadeado e a licao que falta;
- a Guardar mostra "Pra liberar" com as licoes e o atalho para a Trilha;
- porquinho bloqueado com saldo fica com "Passos pendentes": Guardar desligado, Tirar ativo;
- `409 VAULT_EDUCATION_LOCKED` no deposito ou na troca fecha a operacao e mostra o que falta;
- ao concluir a licao que libera, "Ver o porquinho" abre a cena Liberado! no porquinho (`PiggyUnlockScene`);
- aprender nunca bloqueia ver saldo, tirar do porquinho ou sacar, e liberado pela trilha nao quer dizer disponivel: a pausa operacional do vault continua valendo.

Sem o `access` (backend antigo), vale a flag antiga de porquinhos so no Pro.

## Etherfuse e ramp

O app possui telas e contratos para:

- criacao e consulta de cliente;
- formulario KYC e envio de documentos por URL pre-assinada;
- aceite de termos e acordos;
- sincronizacao de contas bancarias;
- cotacao, criacao e acompanhamento de ordens de on/off ramp;
- criacao de trustline e assinatura de XDR de off-ramp.

Na testnet atual, o ciclo completo com vaults de terceiros no DeFindex nao esta disponivel. Essa restricao deve permanecer explicita em demonstracoes e documentacao.

## Experiencia visual e feedback

- tema escuro com acentos rosa, roxo, laranja e dourado;
- fonte Nunito em toda a aplicacao;
- componentes reutilizaveis para botoes, cards, inputs e badges;
- feedback de toque, sons e animacoes para navegacao, sucesso, erro e evolucao;
- mascote evolutivo associado ao progresso do usuario.
