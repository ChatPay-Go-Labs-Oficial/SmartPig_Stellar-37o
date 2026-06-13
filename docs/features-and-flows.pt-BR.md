# Funcionalidades e fluxos

> English version: [features-and-flows.md](features-and-flows.md)

## Evolucao recente

As implementacoes mais recentes incorporadas ate 12 de junho de 2026 incluem:

- login social com Google, e-mail OTP e passkey via Privy;
- persistencia do progresso educacional por usuario;
- transferencia direta de USDC com validacao de conta e trustline;
- historico com transferencias Stellar e estados de deposito/saque;
- trilha com player de licoes, feedback, XP e sons;
- migracao de audio para `expo-audio`;
- redesign de perfil, historico e modais financeiros;
- polling e invalidacao de cache para operacoes pendentes;
- normalizacao de saldos Stellar e exibicao de rendimento diario.

## Autenticacao e carteira

1. O usuario autentica com Google, codigo enviado por e-mail ou passkey.
2. O Privy restaura ou cria a carteira Stellar embarcada.
3. O app autentica o endereco publico no backend.
4. IDs publicos da sessao e da conta sao persistidos localmente.
5. Quando necessario, o app solicita e assina a ativacao da smart account.

As telas antigas de criacao/conexao de carteira continuam no grupo de autenticacao para compatibilidade, mas o fluxo principal atual e orientado pelo Privy.

## Vaults, deposito e saque

- A aba **Investir** lista vaults retornados pelo backend.
- O detalhe consulta informacoes, APY e saldo da carteira.
- Depositos e saques criam intencoes idempotentes no backend.
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

A tela de historico apresenta depositos, saques e transferencias USDC. Estados transitorios e finais devem ser exibidos de forma consistente, sem tratar uma submissao como confirmacao.

## Trilha educacional

- Conteudo definido em `constants/trilha.ts` e `constants/flashcards.ts`.
- `LessonPlayer` controla os tipos de interacao da licao.
- Conclusoes e XP sao armazenados por usuario em `learning.store.ts`.
- Uma licao ja concluida nao soma XP novamente.
- Sons e haptics respeitam a preferencia global do usuario.

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
