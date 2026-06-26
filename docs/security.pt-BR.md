# Seguranca e dados sensiveis

> English version: [security.md](security.md)

## Classificacao

### Publico

- enderecos publicos Stellar e IDs de contrato;
- URLs publicas de RPC, Horizon e API;
- IDs publicos de aplicativos cliente;
- passphrase e configuracao da testnet;
- hashes de transacao e dados publicos da rede.

### Sensivel

- chaves privadas, seed phrases e material de assinatura;
- tokens de acesso, refresh tokens e cookies de sessao;
- API secrets e client secrets;
- documentos KYC, dados bancarios e dados pessoais completos;
- URLs pre-assinadas ainda validas;
- credenciais de build, certificados e keystores.

## Regras obrigatorias

1. Nunca inclua dados sensiveis em README, `docs/`, exemplos, screenshots, issues ou logs.
2. Nunca use `EXPO_PUBLIC_*` para segredos. O conteudo dessas variaveis fica disponivel no bundle.
3. Nunca versione arquivos `.env`; somente `.env.example` com placeholders publicos.
4. Nunca armazene chave privada ou seed phrase em AsyncStorage, Zustand ou backend.
5. Nunca registre tokens, XDR assinado completo, documentos KYC ou URLs pre-assinadas em logs.
6. Revogue e substitua imediatamente qualquer credencial exposta no historico Git.

## Custodia e assinatura

O fluxo atual delega autenticacao e assinatura a carteira embarcada do Privy. O app registra uma funcao de assinatura e envia apenas assinaturas/transacoes necessarias. O backend pode gerar XDR sem assinatura e reconciliar o resultado, mas nao deve receber a chave privada do usuario.

Antes de solicitar assinatura, a interface deve mostrar contexto suficiente da operacao: ativo, valor, destino e finalidade. A submissao deve usar a rede configurada e validar que a assinatura corresponde ao endereco de origem.

## Bloqueio local

Sessoes restauradas automaticamente devem passar por biometria local ao abrir o app e ao retornar do segundo plano quando o aparelho possuir biometria cadastrada. Se a biometria nao estiver disponivel ou cadastrada, o app pode continuar para preservar compatibilidade com o dispositivo.

Falhas ou cancelamentos de biometria mantem o app em uma tela bloqueada sem dados financeiros visiveis. A tela deve permitir tentar novamente ou sair da conta.

## KYC e ramp

- Colete somente os campos exigidos pelo provedor.
- Envie documentos diretamente pelo fluxo de URL pre-assinada.
- Nao persista imagens de documento alem do necessario para o upload.
- Nao inclua payloads pessoais em telemetria ou mensagens de erro.
- Trate contas bancarias e status KYC como dados pessoais, mesmo quando a API retornar IDs opacos.

## Checklist de documentacao e release

- [ ] Nenhum valor real de segredo ou credencial foi adicionado.
- [ ] Exemplos usam placeholders reconheciveis.
- [ ] Logs de desenvolvimento nao contem tokens ou dados pessoais.
- [ ] O build aponta para testnet, salvo aprovacao formal para outro ambiente.
- [ ] Limitacoes de ramp e aviso de produto nao regulado continuam visiveis.
- [ ] Novas dependencias e permissoes nativas foram revisadas.
- [ ] Fluxos de assinatura exibem e validam os dados corretos.
- [ ] Arquivos locais de ambiente permanecem ignorados pelo Git.
