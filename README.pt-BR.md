# PigFi 🐷

**Pequenos investimentos, um universo de possibilidades.**

DEMO: https://smartpigstellar.netlify.app/

A **PigFi** é um aplicativo mobile de investimento em dólar criado para tornar o primeiro investimento simples, acessível e divertido. A proposta é permitir que pessoas que nunca investiram — ou que acham que investir é complicado, caro ou “coisa de rico” — consigam começar com valores baixos, usando uma experiência familiar, leve e gamificada.

Este repositório contém o **aplicativo mobile** da PigFi, desenvolvido em **React Native / Expo** e integrado à infraestrutura da rede **Stellar**.

> Projeto desenvolvido em contexto de hackathon.  
> O ambiente atual usa **testnet** e demonstra os fluxos técnicos possíveis dentro das limitações das integrações disponíveis para avaliação.

---

## Visão geral

A PigFi combina três ideias principais:

1. **Investimento acessível**  
   Uma experiência pensada para quem quer começar com pouco dinheiro e sem precisar entender termos técnicos.

2. **Blockchain invisível para o usuário**  
   A infraestrutura Web3 existe “por baixo do capô”, mas a interface evita jargões como wallet, DeFi, smart contract ou token.

3. **Experiência gamificada**  
   O usuário acompanha seu porquinho crescendo conforme avança no hábito de investir.

Na comunicação com o usuário final, a PigFi não se posiciona como um app cripto. A marca se posiciona como um app simples de investimento em dólar, com linguagem próxima, divertida e objetiva.

---

## Estado atual do projeto

Esta versão representa o estado atual do produto para apresentação no hackathon.

O app mobile já demonstra:

- interface mobile em React Native / Expo;
- fluxo de onboarding;
- criação ou conexão de carteira Stellar;
- navegação por abas;
- listagem de vaults;
- visualização de saldo, histórico e perfil;
- integração com backend próprio;
- preparação para fluxos de depósito, saque e ramp;
- experiência visual alinhada à identidade PigFi.

O backend relacionado ao projeto está em outro repositório:

```txt
https://github.com/ChatPay-Go-Labs-Oficial/smartpig-backend
```

---

## Backend

A PigFi depende do backend `smartpig-backend` para a orquestração dos fluxos de API, wallet, vaults, depósitos, saques, ramp e integrações com Stellar/DeFindex.

O backend atua como intermediário entre o app mobile e os serviços externos. Entre suas responsabilidades estão:

- autenticação via carteira Stellar;
- cadastro ou recuperação de usuário a partir do endereço da wallet;
- consulta de vaults;
- geração de XDRs para depósito e saque;
- recebimento de XDRs assinados pelo app;
- submissão de transações para a rede Stellar;
- persistência de intenções de depósito e saque;
- reconciliação e atualização de status;
- integração com serviços de on/off ramp.

Repositório do backend:

```txt
https://github.com/ChatPay-Go-Labs-Oficial/smartpig-backend
```

---

## Observação importante sobre Etherfuse, on/off ramp e testnet

No desenho do produto, a PigFi usa infraestrutura de **on/off ramp** para permitir que o usuário entre e saia da experiência de investimento a partir de dinheiro local.

No estado atual do hackathon, a integração considerada para ramp é a **Etherfuse**.

Porém, existe uma limitação relevante no ambiente de avaliação:

> Em ambiente de **testnet**, a Etherfuse não executa o fluxo completo de on/off ramp para terceiros integrados ao **DeFindex**.

Isso significa que, para esta entrega, o app consegue demonstrar a arquitetura, a experiência mobile, a integração com Stellar, a preparação dos fluxos e a lógica de produto, mas o fluxo completo de dinheiro local → investimento em DeFindex → retirada via ramp depende de condições que não estão disponíveis em testnet para terceiros.

Essa limitação não é uma ausência de intenção do produto, mas uma restrição do ambiente de integração durante o hackathon.

Na prática, para avaliação:

- o app deve ser testado como **MVP mobile em testnet**;
- a experiência de produto e os fluxos de carteira/vault devem ser avaliados dentro do ambiente disponível;
- o on/off ramp completo deve ser entendido como dependente da disponibilidade da integração em ambiente compatível;
- em produção, o fluxo exigiria credenciais, ambiente habilitado, compliance e integração operacional completa com o provedor de ramp.

---

## Arquitetura geral

```txt
Usuário
  │
  ▼
App Mobile PigFi
React Native / Expo
  │
  │ HTTPS / REST
  ▼
PigFi Backend
NestJS / Prisma / PostgreSQL
  │
  ├── Stellar Network
  │
  ├── DeFindex
  │
  └── Etherfuse
      On/Off Ramp
      Limitação em testnet para terceiros + DeFindex
```

---

## Stack do app mobile

| Camada | Tecnologia |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81 |
| Linguagem | TypeScript |
| Roteamento | Expo Router |
| Estado global | Zustand + AsyncStorage |
| Dados remotos | TanStack Query + Axios |
| Wallet | Stellar Wallets Kit + WalletConnect |
| UI e animações | Expo Linear Gradient / Reanimated |
| Rede | Stellar testnet |
| Backend | NestJS API em repositório separado |

---

## Instalação para desenvolvimento local

### Pré-requisitos

- Node.js 20 ou superior;
- npm;
- Expo;
- Android Studio ou dispositivo físico Android;
- backend da PigFi rodando ou uma URL de backend disponível;
- variáveis de ambiente configuradas.

### 1. Clonar o repositório mobile

```bash
git clone https://github.com/ChatPay-Go-Labs-Oficial/SmartPig_Stellar-37o.git
cd SmartPig_Stellar-37o
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` com base no `.env.example`:

```bash
cp .env.example .env
```

Exemplo de variáveis usadas pelo app:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
EXPO_PUBLIC_ACCOUNT_WASM_HASH=
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

Para rodar com backend remoto, substitua `EXPO_PUBLIC_API_URL` pela URL pública da API.

### 4. Rodar o app

```bash
npx expo start
```

Para Android:

```bash
npx expo start --android
```

Para iOS:

```bash
npx expo start --ios
```

Para web:

```bash
npx expo start --web
```

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor Expo |
| `npm run android` | Abre o app no Android |
| `npm run ios` | Abre o app no iOS |
| `npm run web` | Abre o app no navegador |
| `npm run lint` | Executa lint do projeto |

---

## Instalação via APK para avaliação

Como a PigFi é um aplicativo mobile em **React Native**, a forma mais direta de avaliação no hackathon é por meio do **APK Android**.

### Como instalar o APK

1. Acesse o link do APK https://expo.dev/accounts/matheusbrasilaguiar/projects/stellarpig-app/builds/90bb14e9-7484-4c57-8ba6-55d548f0acdd
2. Baixe o arquivo `.apk` em um dispositivo Android.
3. Caso o Android bloqueie a instalação, habilite a opção de instalar apps de fontes desconhecidas para o navegador ou gerenciador de arquivos usado.
4. Abra o APK baixado.
5. Confirme a instalação.
6. Abra o app PigFi.
7. Teste o fluxo disponível em ambiente de testnet.

### Observações para avaliadores

- O APK é destinado à avaliação técnica e de produto no contexto do hackathon.
- O app usa ambiente de testnet.
- O app não deve ser usado como produto financeiro real.
- O fluxo completo de on/off ramp com Etherfuse + DeFindex possui limitação em testnet para terceiros.
- A experiência avaliada deve considerar o estado atual do MVP e as restrições externas de integração.

---

## Como testar o fluxo principal

1. Instale o APK ou rode o app localmente via Expo.
2. Abra o app PigFi.
3. Avance pelo onboarding.
4. Crie ou conecte uma carteira Stellar.
5. Acesse a home do app.
6. Consulte vaults disponíveis.
7. Navegue entre as abas de vaults, histórico e perfil.
8. Observe os fluxos preparados para depósito, saque e ramp.
9. Considere a limitação de testnet da Etherfuse para o fluxo completo de on/off ramp com DeFindex.

---

## Estrutura principal do projeto

```txt
app/
  _layout.tsx
  (auth)/
    index.tsx
    create-wallet.tsx
    connect-wallet.tsx
  (tabs)/
    index.tsx
    vaults.tsx
    history.tsx
    profile.tsx
  vault/
    [id].tsx

components/
  ui/
  layout/

lib/
  api/
  queries/
  stores/
  wallet-kit.ts

constants/
  theme.ts
```

---

## Design e marca

A PigFi segue uma direção visual **tech-afetiva**:

- interface escura;
- neon rosa, roxo e azul;
- linguagem simples;
- mascote do porquinho;
- experiência divertida, mas sem parecer infantil;
- tecnologia invisível para o usuário final.

A marca evita linguagem cripto na comunicação com o usuário. O foco está em simplicidade, confiança e acessibilidade.

---

## Segurança e limites da versão atual

Esta versão é uma entrega de hackathon em testnet.

Ela não deve ser interpretada como:

- produto financeiro em produção;
- recomendação de investimento;
- promessa de rentabilidade;
- serviço regulado disponível ao público;
- app pronto para uso com dinheiro real.

Antes de uma versão de produção, seriam necessários:

- ambiente mainnet;
- integração operacional completa de ramp;
- validação jurídica e regulatória;
- política de risco;
- termos de uso;
- política de privacidade;
- monitoramento;
- auditoria de segurança;
- testes de carga e confiabilidade;
- estratégia de suporte ao usuário.

---

## Repositórios relacionados

App mobile:

```txt
https://github.com/ChatPay-Go-Labs-Oficial/SmartPig_Stellar-37o
```

Backend:

```txt
https://github.com/ChatPay-Go-Labs-Oficial/smartpig-backend
```

---

## Licença

Projeto desenvolvido para fins de demonstração em hackathon.

O uso, distribuição e evolução do projeto devem seguir as decisões da organização responsável pelo repositório.

---
## Estado atual do projeto

Esta versão representa o estado atual do produto para apresentação no hackathon.

> **Nota sobre a branch de avaliação**
>
> Para esta entrega do hackathon, estamos usando a branch `[feat/build-mvp]`, pois ela contém os mocks necessários para demonstrar o fluxo atual do produto em ambiente de testnet.
>
> Essa decisão foi tomada para não poluir a branch `main` com dados e comportamentos temporários de demonstração. A `main` permanece como base mais limpa do projeto, enquanto a branch de avaliação concentra os ajustes específicos para testes, apresentação e validação do MVP.

...
