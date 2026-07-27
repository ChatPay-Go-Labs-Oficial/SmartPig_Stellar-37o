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
