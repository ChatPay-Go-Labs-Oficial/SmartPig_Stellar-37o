# Desenvolvimento

> English version: [development.md](development.md)

## Requisitos

- Node.js 20 ou superior;
- npm;
- ambiente Android ou iOS suportado pelo Expo SDK 54;
- backend PigFi acessivel localmente ou por HTTPS.

## Configuracao

```bash
npm install
cp .env.example .env
npm start
```

Em dispositivo fisico, `localhost` aponta para o proprio dispositivo. Use o IP da maquina de desenvolvimento ou um endpoint HTTPS acessivel.

## Variaveis de ambiente

Todas as variaveis Expo abaixo sao incorporadas ao bundle do cliente e devem ser consideradas publicas.

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
EXPO_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
EXPO_PUBLIC_USDC_ISSUER=<PUBLIC_STELLAR_ISSUER>
EXPO_PUBLIC_ACCOUNT_WASM_HASH=<PUBLIC_CONTRACT_HASH>
EXPO_PUBLIC_WEBAUTHN_VERIFIER_ADDRESS=<PUBLIC_CONTRACT_ADDRESS>
EXPO_PUBLIC_NATIVE_TOKEN_CONTRACT=<PUBLIC_CONTRACT_ADDRESS>
EXPO_PUBLIC_STELLAR_RP_ID=<RELYING_PARTY_ID>
EXPO_PUBLIC_RELYING_PARTY=<RELYING_PARTY_ID>
EXPO_PUBLIC_PRIVY_APP_ID=<PUBLIC_PRIVY_APP_ID>
EXPO_PUBLIC_PRIVY_CLIENT_ID=<PUBLIC_PRIVY_CLIENT_ID>
```

Algumas rotas legadas podem referenciar `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`. Mantenha a variavel apenas enquanto esse fluxo continuar suportado.

Nao documente nem adicione ao app segredos de API, client secrets, seed phrases, chaves privadas ou tokens administrativos. Esses valores pertencem ao backend ou ao gerenciador de segredos do ambiente de build.

## Estrutura

```text
app/                 rotas Expo Router
components/ui/       componentes visuais reutilizaveis
components/layout/   estruturas compartilhadas de tela
constants/           tema e conteudo estatico
hooks/               comportamento reutilizavel de React
lib/api/             contratos e chamadas HTTP
lib/queries/         hooks TanStack Query
lib/stellar/         integracao e assinatura Stellar
lib/stores/          estado Zustand
assets/              imagens, fontes e sons
docs/                documentacao tecnica e de produto
```

## Padroes de implementacao

### Dados remotos

- Declare o contrato HTTP em `lib/api`.
- Encapsule cache e mutacoes em `lib/queries`.
- Use chaves de query estaveis por dominio e identidade.
- Invalide caches relacionados apos mutacoes.
- Use polling apenas para estados realmente transitorios.

### Estado local

- Use Zustand para estado compartilhado da aplicacao.
- Persista somente o necessario e defina uma chave de storage estavel.
- Particione dados por usuario quando uma sessao nao puder compartilhar progresso.
- Nunca persista material criptografico sensivel em AsyncStorage.

### Telas e componentes

- Telas compoem comportamento; componentes reutilizaveis ficam em `components`.
- Use tokens de `constants/theme.ts` em vez de duplicar cores e fontes.
- Reexporte componentes publicos nos arquivos `index.ts` do modulo.
- Mensagens ao usuario devem ser simples e evitar jargao de blockchain.

### Stellar

- Valide enderecos, unidades e limites antes de solicitar assinatura.
- Preserve sete casas decimais para ativos Stellar.
- Diferencie transacao submetida de transacao confirmada.
- Mapeie codigos da rede para erros acionaveis na interface.

## Validacao antes de abrir PR

```bash
npm run lint
npx tsc --noEmit
```

Tambem valide manualmente os fluxos alterados no alvo mobile relevante. Operacoes financeiras devem ser testadas somente na testnet configurada.

## Atualizacao da documentacao

Atualize os documentos no mesmo PR quando houver mudanca em:

- fluxo visivel ao usuario;
- variavel de ambiente;
- rota ou responsabilidade de modulo;
- contrato de API ou estado de operacao;
- regra de seguranca/custodia;
- token ou API publica do design system.
