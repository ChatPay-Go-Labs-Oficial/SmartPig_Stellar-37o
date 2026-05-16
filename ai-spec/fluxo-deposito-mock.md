# Fluxo de Depósito (On-Ramp BRL → USDC) — Modo Mock

## Visão Geral

O fluxo de depósito converte BRL para USDC via Etherfuse (parceiro de on-ramp).
Como o ambiente sandbox/devnet da Etherfuse tem instabilidades (site de KYC fora do ar, erros de terms & conditions), foi implementado um **modo mock** que simula todo o fluxo localmente — sem chamar nenhuma API externa da Etherfuse.

O mock usa exatamente as mesmas interfaces e estruturas de dados da integração real, então a troca para produção é feita mudando apenas uma variável de ambiente.

---

## Como Ligar/Desligar o Mock

No arquivo `.env` do app:

```env
# Ligar mock (sem Etherfuse real)
EXPO_PUBLIC_MOCK_ETHERFUSE=true

# Desligar mock (integração real)
EXPO_PUBLIC_MOCK_ETHERFUSE=false
```

Não é necessário alterar nenhum outro arquivo.

---

## Fluxo Completo de Depósito

```
[Tela de Valor]
      ↓ usuário digita valor em BRL
[Verificação de Trustline]  ← pulada no mock
      ↓ trustline USDC configurada na carteira Stellar
[Cotação]  ← mockada ou real
      ↓ BRL → USDC com taxa e expiração de 2 min
[Confirmação da Cotação]
      ↓ usuário confirma
[Criação da Ordem]  ← mockada ou real
      ↓ ordem criada na Etherfuse
[Tela de Pagamento]
      ↓ chave PIX exibida para o usuário copiar e pagar
[Simulação de Pagamento]  ← disponível em mock e sandbox
      ↓ confirma recebimento do BRL
[USDC creditado na carteira Stellar]
```

---

## Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---|---|
| `lib/api/etherfuse.mock.ts` | Dados mockados: conta bancária, cotação, ordem, instruções PIX |
| `lib/api/etherfuse.api.ts` | Switch automático mock/real; tipos `OnrampOrder`, `DepositInstructions` |
| `app/(modals)/deposit/index.tsx` | Tela de valor; pula trustline no mock |
| `app/(modals)/deposit/quote.tsx` | Tela de cotação; passa instruções PIX para a próxima tela |
| `app/(modals)/deposit/payment.tsx` | Tela de pagamento; exibe chave PIX com botão de copiar |

---

## O Que o Mock Simula

### Conta Bancária (`listBankAccounts`)
```json
{
  "id": "mock-bank-account-local-id",
  "rail": "pix",
  "isCompliant": true
}
```
Retorna uma conta PIX já aprovada (compliant) para o botão "Cotar agora" ficar habilitado.

### Cotação (`getQuote`)
- Taxa de câmbio: ~R$ 5,08 por USDC (0,19682 USDC/BRL)
- Fee: 20 bps (0,20%)
- Expiração: 2 minutos a partir da chamada
- Exemplo: R$ 100 → ~19,48 USDC (após fee)

### Ordem (`createOnramp`)
```json
{
  "id": "mock-order-...",
  "status": "processing",
  "depositInstructions": {
    "pixKey": "uuid-gerado-aleatoriamente",
    "pixKeyType": "evp",
    "amount": 100.00,
    "currency": "BRL",
    "beneficiaryName": "PigFi Tecnologia"
  }
}
```

### Simulação de Pagamento (`sandboxSimulatePayment`)
```json
{ "simulated": true }
```

---

## Tela de Pagamento — O Que é Exibido

Após confirmar a cotação, o usuário vê:

1. **Instrução de Pagamento PIX**
   - Valor a pagar em BRL (destaque)
   - Chave PIX (tipo EVP — UUID aleatório)
   - Botão **Copiar** (copia a chave para o clipboard)
   - Nome do beneficiário

2. **Detalhes do Pedido**
   - ID do pedido
   - Valor enviado
   - USDC a receber

3. **Botão "Simular pagamento PIX"** (visível em mock e sandbox)
   - Confirma o recebimento do BRL
   - Dispara o crédito de USDC na carteira

---

## Como Será na Integração Real

Quando a Etherfuse estiver operacional, basta:

1. Mudar `.env`: `EXPO_PUBLIC_MOCK_ETHERFUSE=false`
2. Garantir que o usuário completou o KYC no site da Etherfuse
3. Garantir que `syncBankAccounts` foi chamado após o KYC
4. O resto do fluxo é idêntico — mesmas telas, mesmos tipos

### Pendências para integração real

| Pendência | Descrição |
|---|---|
| KYC no site Etherfuse | Site devnet estava fora do ar — testar quando estabilizar |
| Aceitar agreements | Chamar os 3 endpoints antes de criar ordem (`/agreements/esign`, `/agreements/terms`, `/agreements/customer`) |
| `depositInstructions` real | Verificar se `POST /ramp/order` retorna `depositInstructions` no response ou se é necessário buscar em `/ramp/order/{id}` |
| Email/Phone na ordem | Etherfuse pode exigir `email` e `phoneNumber` no body de `POST /ramp/order` — investigar e adicionar ao `CreateOrderParams` se necessário |

---

## Problemas Encontrados no Sandbox (Histórico)

| Erro | Causa | Status |
|---|---|---|
| `"Bank account not found"` | `bankAccountId` passado era o Etherfuse UUID, não o ID interno do nosso DB | Resolvido: usar `EtherfuseBankAccount.id` (interno) |
| `"Terms and conditions have not been completed"` | Agreements não foram aceitos via API antes de criar a ordem | Workaround: aceitar agreements antes do onramp |
| `"Email not provided"` / `"Phone not provided"` | Etherfuse exige esses campos — possivelmente no body do `POST /ramp/order` | A investigar |
| Site devnet KYC não funciona | `devnet.etherfuse.com/ramp/onboarding` não permitia criar conta | Em aberto — contatar Etherfuse |
| Trustline `tx_bad_auth` | Lobstr estava em modo mainnet, app em testnet — passphrase diferente | Resolvido: mudar Lobstr para Testnet em Configurações → Rede |
