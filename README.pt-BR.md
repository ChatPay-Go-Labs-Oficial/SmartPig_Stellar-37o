# PigFi 🐷💸

**Pequenos investimentos, um universo de possibilidades.**

Site: https://use.pigfi.app

Android Apk: https://expo.dev/accounts/maykro/projects/pigfi/builds/d5b83ae2-c2a6-48f5-a79e-ac4d3b8960cf

O PigFi é um aplicativo brasileiro de educação financeira gamificada que ajuda adultos e famílias a criarem o hábito de guardar em dólar, a partir de pequenos valores via Pix. A tecnologia Stellar, a carteira não custodial e os parceiros de infraestrutura operam nos bastidores, para que o usuário tenha uma experiência simples, visual e sem precisar entender câmbio, criptomoedas ou mercados financeiros.

Este repositório contém o **app mobile** construído com **Expo / React Native**, integrado ao backend PigFi, infraestrutura Stellar mainnet e fluxos de wallet.

> **Status:** MVP em mainnet. Demonstra a experiência do produto, conexão de wallet, integração com o backend, fluxos de investimento Stellar/DeFindex e arquitetura de ramp. O app está operacional no Android. Submissão para Apple App Store e Google Play em andamento, aguardando aprovação.

---

## Visão geral do produto

O PigFi existe para tornar o investimento em dólar tão simples quanto guardar moedas num cofrinho.

O produto é pensado para quem acredita que investir é complicado, caro ou "não é para mim" e quer oferecer outra opção de hábito e educação financeira para sua família. Em vez de expor o usuário a vocabulário cripto, wallets, DeFi, protocolos de yield ou mecânicas de blockchain, o PigFi traduz a experiência para uma linguagem familiar:

- comece com um valor pequeno;
- use um fluxo parecido com Pix;
- veja o porquinho crescer;
- entenda o progresso visualmente;
- sem jargão financeiro ou cripto.

A direção de marca é intencionalmente **tech-afetiva**: um app financeiro moderno com um personagem porquinho astronauta, UI escura, neons e tom de voz simples. Voltado para o público familiar e de educação financeira.

---

## O que o app faz

Na versão atual, o PigFi demonstra:

- onboarding mobile;
- criação e conexão de wallet Stellar;
- estado persistente de wallet e usuário;
- listagem de vaults de investimento disponíveis via backend;
- visualização de portfólio e informações de vault;
- fluxos de depósito e saque;
- comunicação com a API do backend;
- infraestrutura Stellar mainnet;
- experiência de produto do fluxo Pix → investimento em dólar.

---

## Repositórios relacionados

O PigFi é dividido em dois repositórios principais:

| Repositório            | Propósito                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| `SmartPig_Stellar-37o` | App mobile construído com Expo / React Native                            |
| `smartpig-backend`     | Backend API construído com NestJS, Prisma/PostgreSQL, Stellar e DeFindex |

O backend é responsável por orquestração de API, dados de vault, intenções de depósito/saque, geração de XDR, jobs em background e comunicação com Stellar/DeFindex.

Repositório do backend:

```txt
https://github.com/ChatPay-Go-Labs-Oficial/smartpig-backend
```

---

## Arquitetura

```txt
PigFi Mobile App
Expo / React Native
        │
        │ HTTPS / REST
        ▼
PigFi Backend API
NestJS + Prisma + PostgreSQL
        │
        ├── Login por wallet / persistência de usuário
        ├── Catálogo e sincronização de vaults
        ├── Intenções de depósito e saque
        ├── Geração de XDR não assinado
        ├── Submissão de XDR assinado
        └── Jobs de reconciliação em background
        │
        ▼
Stellar Mainnet + DeFindex
        │
        ▼
Camada de ramp: parceiro de on/off ramp regulamentado
```

---

## Stack mobile

| Camada        | Tecnologia                                |
| ------------- | ----------------------------------------- |
| Framework     | Expo SDK 54 + React Native 0.81           |
| Linguagem     | TypeScript                                |
| Roteamento    | Expo Router                               |
| Estado        | Zustand + AsyncStorage                    |
| Dados remotos | TanStack Query + Axios                    |
| Wallet        | Privy (embedded wallets) + WebAuthn       |
| UI / animação | Expo Linear Gradient + Reanimated         |
| Storage       | AsyncStorage / SecureStore onde aplicável |

---

## Stack backend

| Camada             | Tecnologia                          |
| ------------------ | ----------------------------------- |
| Runtime            | Node.js 20+                         |
| Framework          | NestJS                              |
| ORM                | Prisma                              |
| Banco de dados     | PostgreSQL                          |
| Blockchain         | Stellar                             |
| Integração DeFi    | DeFindex SDK / API                  |
| Jobs em background | NestJS Schedule / cron jobs         |
| Validação          | class-validator / class-transformer |

---

## Fluxos principais do backend

O backend suporta:

- login por wallet usando o endereço Stellar do usuário;
- descoberta e sincronização de vaults;
- jobs de APY e snapshot de portfólio;
- criação de intenção de depósito;
- geração de XDR não assinado para assinatura no app mobile;
- submissão de XDR assinado;
- criação de intenção de saque;
- jobs de reconciliação para status de transações.

O backend não armazena a chave privada do usuário. O padrão esperado é:

1. backend prepara a operação;
2. backend retorna um XDR não assinado;
3. usuário assina pelo fluxo de wallet no mobile;
4. backend submete ou reconcilia a transação assinada.

---

## Pré-requisitos

Para rodar o app mobile localmente:

- Node.js 20+
- npm
- Expo CLI / Expo tooling
- Android Studio ou dispositivo Android físico
- Backend API rodando localmente ou em deploy
- Configuração Stellar mainnet
- Privy App ID
- WalletConnect Project ID

Para rodar o backend localmente, siga a documentação do repositório do backend.

---

## Variáveis de ambiente

Crie um arquivo `.env` no repositório mobile usando o exemplo abaixo:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_STELLAR_RPC_URL=https://soroban-mainnet.stellar.org
EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
EXPO_PUBLIC_ACCOUNT_WASM_HASH=
EXPO_PUBLIC_PRIVY_APP_ID=
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

Para testes locais em dispositivo Android físico, `localhost` aponta para o próprio telefone, não para o computador. Use o IP local da sua máquina ou uma URL de tunnel para `EXPO_PUBLIC_API_URL`.

Exemplo:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
```

---

## Instalação e execução local

```bash
# Clonar o repositório
git clone https://github.com/ChatPay-Go-Labs-Oficial/SmartPig_Stellar-37o.git
cd SmartPig_Stellar-37o

# Instalar dependências
npm install

# Iniciar o Expo
npx expo start
```

Em seguida, escolha uma das opções disponíveis:

```bash
# Android
npm run android

# iOS
npm run ios

# Preview web
npm run web

# Lint
npm run lint
```

---

## Rodando com o backend

Clone e execute o backend separadamente:

```bash
git clone https://github.com/ChatPay-Go-Labs-Oficial/smartpig-backend.git
cd smartpig-backend
npm install
npm run start:dev
```

O app mobile deve apontar para o backend via `EXPO_PUBLIC_API_URL`.

O repositório do backend contém a documentação técnica de:

- arquitetura;
- schema do banco de dados;
- REST API;
- fluxos de depósito e saque;
- integração DeFindex;
- jobs;
- deploy.

---

## Instalação do APK Android

O PigFi é uma aplicação React Native. Para testes em Android, use o APK gerado neste repositório.

### Como instalar o APK

1. Baixe o APK em https://expo.dev/accounts/maykro/projects/pigfi/builds/d5b83ae2-c2a6-48f5-a79e-ac4d3b8960cf
2. Abra o arquivo APK no dispositivo Android.
3. Se o Android bloquear a instalação, habilite a instalação de fontes desconhecidas no navegador ou gerenciador de arquivos utilizado.
4. Confirme a instalação.
5. Abra o PigFi.

### Disponibilidade nas lojas

Submissões para Apple App Store e Google Play realizadas e aguardando aprovação.

---

## Modelo de segurança e custódia

- O app é projetado para que os usuários não precisem entender terminologia blockchain.
- A autenticação e proteção de chaves são gerenciadas pela Privy.
- O backend não armazena chaves privadas.
- Operações blockchain são preparadas como XDRs não assinados onde aplicável.
- A assinatura pelo usuário faz parte do fluxo de interação com a wallet.

---

## Princípios de marca e UX

O PigFi deve parecer:

- simples;
- amigável;
- transparente;
- divertido;
- financeiramente responsável;
- não técnico para o usuário final.

O PigFi deve evitar:

- jargão cripto na interface do usuário;
- linguagem financeira complexa;
- promessas de retorno irrealistas;
- mensagens de "enriqueça rápido";
- apresentar o produto como banco ou corretora tradicional.

As camadas de blockchain e DeFi são infraestrutura, não a história voltada ao usuário.

---

## Scripts

| Comando           | Descrição                                 |
| ----------------- | ----------------------------------------- |
| `npm start`       | Inicia o servidor de desenvolvimento Expo |
| `npm run android` | Abre o target de build Android            |
| `npm run ios`     | Abre o simulador iOS                      |
| `npm run web`     | Abre o preview web                        |
| `npm run lint`    | Executa o lint do Expo                    |

---

## Disclaimer

O PigFi é um MVP em mainnet. Não é um produto de investimento regulamentado em produção e não deve ser usado como aconselhamento financeiro. Qualquer lançamento em produção exigirá revisões adicionais.

---

## HackMeridian 2026 — PigFi Experience

> Trilha Scale · Lisboa, 25 e 26 de outubro de 2026. Esta seção documenta a contribuição do hackathon separadamente do produto existente descrito acima. [English version](README.md#hackmeridian-2026--pigfi-experience).

### Por que desenvolvemos

Facilitar o primeiro depósito é só o começo. A pessoa também precisa entender o que está usando, ganhar confiança e ter um motivo para voltar. O PigFi Experience acrescenta lições curtas, progresso visível e pagamentos práticos ao hábito familiar de guardar dinheiro.

O objetivo é ajudar quem está começando a guardar a se tornar um usuário mais confiante da Stellar. O aprendizado acontece dentro do app, com uma ideia por vez, perguntas e feedback imediato. Enviar para um contato dá uma aplicação cotidiana a esse aprendizado.

### O que já existia e o que entrou no hackathon

| Antes do HackMeridian | Desenvolvido para o HackMeridian |
| --- | --- |
| App mobile conectado à Stellar mainnet e carteiras integradas | PigFi Experience: XP, Nível de Usuário, recompensa do dia e cenas de evolução |
| Experiência Pix para dólar e integração DeFindex | Módulo introdutório com cinco lições e progresso salvo |
| Vaults de USDC, EURC e XLM, com reconhecimento de risco | Liberação progressiva de moedas e porquinhos pelo aprendizado no Lite |
| Troca de moedas e transferência por endereço | @ permanente e envio de USDC, EURC ou XLM para contatos PigFi |

O **Nível de Usuário** representa aprendizado e participação. É separado do **Nível do Porquinho**, que reflete o valor guardado ou investido. Depósitos, saques, transferências e valores movimentados nunca dão XP.

### Parte 1 — Aprender, evoluir e liberar

- O usuário novo começa no Nível de Usuário 0. A jornada tem as etapas Iniciante, Consistente, Dedicado e Veterano, com progresso visível e feedback de subida de nível.
- O XP vem da recompensa do dia, da lição concluída e do módulo concluído. Respostas individuais não dão XP.
- O backend é a fonte de verdade de XP, nível, progresso das lições e acesso aos porquinhos. A lição retoma do ponto salvo; conteúdo e validação das respostas vêm do backend.
- O módulo introdutório tem cinco lições: Fundamentos; Wallet/Ramp/Vault; Diversificação dólar/euro; Volatilidade de XLM; Liquidez e saída.

**Regras de elegibilidade desta entrega:**

| Moeda | Acesso no Lite |
| --- | --- |
| USDC — dólar | Livre, sem pré-requisito de aprendizado |
| EURC — euro | Concluir Fundamentos, Wallet/Ramp/Vault e Diversificação dólar/euro |
| XLM — criptomoeda | Concluir as cinco lições introdutórias |

Nesta entrega, o nível mínimo fica temporariamente em 0: a conclusão das lições determina a liberação educacional. O escopo prevê voltar aos níveis mínimos 5 para EURC e 10 para XLM quando houver mais conteúdo, preservando o acesso já conquistado.

No Lite, a troca e novos depósitos nos porquinhos seguem a elegibilidade educacional. No Pro, essas restrições educacionais não se aplicam. O aceite de riscos por vault continua obrigatório nos dois modos. O aprendizado nunca bloqueia consulta de saldo, saque ou recuperação de fundos; a disponibilidade operacional do vault é conferida separadamente.

### Parte 2 — Nome de usuário e enviar para contatos

Implementação: [`feat/send-to-contacts`](https://github.com/ChatPay-Go-Labs-Oficial/SmartPig_Stellar-37o/tree/feat/send-to-contacts), enviada para `feat/pigfi-meridian` pelo [PR #40](https://github.com/ChatPay-Go-Labs-Oficial/SmartPig_Stellar-37o/pull/40). Essas funcionalidades precisam do código da Parte 2 e do backend com o módulo de usernames.

- Criação do @ permanente pelo Perfil, com validação do formato, consulta de disponibilidade e feedback de nome em uso ou falha de rede.
- Enviar no Lite e Transferir no Pro, buscando outro usuário PigFi pelo @ exato. Sem @ próprio, a criação abre primeiro e retorna ao envio.
- Nome do cadastro exibido somente quando verificado; caso contrário, “Usuário PigFi”. O envio para o próprio @ é bloqueado.
- Seleção de USDC, EURC ou XLM entre moedas com saldo. No Lite, a restrição pela trilha aparece com cadeado. O app confere saldo insuficiente e se o destinatário aceita a moeda.
- Revisão de destinatário, moeda e valor, biometria e assinatura. Destino e saldo são conferidos novamente na rede antes de assinar; o sucesso exige aceitação pela rede.
- Sem resposta da rede, consulta pelo hash da transação. Tentar novamente reenvia a mesma transação assinada para evitar pagamento duplicado.
- Contatos salvos no aparelho, por conta, contendo somente @ e nome. São apagados ao sair e na exclusão da conta.

Esta entrega atende somente @ do PigFi, sem federação com outras carteiras. O envio por endereço do Pro, já existente e limitado a USDC, continua disponível.

### Como usamos a Stellar

O envio para contatos é um pagamento entre as carteiras Stellar dos dois usuários. O backend resolve o @ para identificar o destinatário; o app prepara a transação, conduz a assinatura pela carteira e envia pela integração Stellar. USDC e EURC são ativos emitidos; XLM é o ativo nativo da Stellar. A capacidade de receber a moeda é conferida antes do envio.

O progresso educacional e o XP ficam no backend. Os pagamentos são liquidados na Stellar. A experiência existente dos porquinhos usa Stellar e DeFindex; o hackathon acrescenta regras de acesso pelo aprendizado e pagamentos por nome de usuário sobre essa infraestrutura.

### Roteiro para avaliação e demonstração

1. Use a branch do hackathon `feat/pigfi-meridian`. Para a Parte 2, use uma revisão que contenha o PR #40 ou avalie `feat/send-to-contacts` diretamente.
2. Execute o backend com os módulos de Experience, Learning, elegibilidade e usernames. A dependência de desenvolvimento é `feat/pigfi-experience-learning-eligibility` no [repositório do backend](https://github.com/ChatPay-Go-Labs-Oficial/smartpig-backend).
3. Siga a instalação acima e o [guia de desenvolvimento](docs/development.pt-BR.md). Configure app e backend para a mesma rede Stellar, emissores dos ativos e serviços implantados. O APK citado anteriormente não está identificado aqui como um build do HackMeridian.
4. No Lite, veja o Nível de Usuário na Home, pegue a recompensa do dia e abra a trilha. Conclua lições, acompanhe o XP e a evolução, e confira a liberação de EURC/XLM.
5. Confira que uma restrição de aprendizado mantém saldo e saques acessíveis. Compare a experiência com o Pro.
6. Com a Parte 2 instalada, crie um @ no Perfil, encontre uma segunda conta PigFi e avance até a revisão. Confira destinatário, moeda e valor antes de confirmar um pagamento real.

### Validação e pendências

O relato de implementação da Parte 2 registra `npx tsc --noEmit` limpo, lint com 0 erros e validação em Android contra o backend local, em Lite e Pro, comparando com o Figma, até a revisão do envio. São os testes relatados da implementação; não representam validação de transferência real para todas as moedas.

Pendente ou fora desta entrega:

- Transferência real com valor mínimo em USDC, EURC e XLM entre duas contas do time; faltava uma segunda conta na validação relatada.
- Contatos salvos no servidor; o backend ainda não tem a rota.
- Visual v2 do envio por endereço do Pro, reservado para outro PR.
- Chama, Metas de Economia, PigCoin e badges de conquista.
- Ampliação do conteúdo das etapas Dedicado e Veterano.

O pitch aponta retenção D7/D30, conclusão de lições, usuários que voltam e recorrência de transferências como métricas futuras. Esta documentação não declara resultados dessas métricas.

### Documentação e time

| Referência | Português | English |
| --- | --- | --- |
| Funcionalidades e fluxos | [Ler](docs/features-and-flows.pt-BR.md) | [Read](docs/features-and-flows.md) |
| Arquitetura | [Ler](docs/architecture.pt-BR.md) | [Read](docs/architecture.md) |
| Design system | [Ler](docs/design-system.pt-BR.md) | [Read](docs/design-system.md) |
| Desenvolvimento | [Ler](docs/development.pt-BR.md) | [Read](docs/development.md) |
| Segurança | [Ler](docs/security.pt-BR.md) | [Read](docs/security.md) |

O deck da submissão apresenta o time: Vanessa Barros (CEO), Carol Tavares (CPO), Maycon Rodrigues (CTO) e Matheus Brasil (CAIO).

Este acréscimo usa como referências o pitch *PigFi Experience — HackMeridian 2026*, o documento *PigFi — Escopo do HackMeridian 2026 v1.0.2*, a implementação no repositório e a descrição do PR da Parte 2. O README anterior foi preservado como documentação original do produto; esta seção registra o recorte do hackathon e os limites da validação.
