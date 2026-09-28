# CI e Proteção de Branch

## Visão Geral

Este projeto Expo/React Native está configurado com pipeline de CI e proteção de branch para garantir qualidade e segurança no código.

## Estrutura de Branches

- **main**: Branch de produção protegido
- **feat/**: Branches para novas funcionalidades
- **fix/**: Branches para correções de bugs

## Configuração de CI (Continuous Integration)

### Workflow: `.github/workflows/ci.yml`

O pipeline de CI é executado automaticamente em:
- Pull requests direcionados para `main`
- Pushes para `main`

#### Jobs do CI

1. **Lint**: Executa `npm run lint` para verificar estilo e qualidade do código
2. **Build Check**: 
   - Executa `npx tsc --noEmit` para verificação de TypeScript
   - Nota: Expo doctor não é executado (problemas existentes no projeto serão corrigidos separadamente)

Todos os jobs devem passar para que o PR possa ser merged.

## Proteção de Branch

### Regras de Proteção da Branch `main`

As seguintes regras estão configuradas via GitHub CLI:

1. **Enforce Admins**: Ativado - Administradores também devem seguir as regras
2. **Required Pull Request Reviews**:
   - Requer 1 aprovação
   - Requer aprovação de code owners
   - Não dispensa reviews antigos
3. **Required Status Checks**:
   - Strict mode: Ativado (PRs devem estar atualizados com main)
   - Checks obrigatórios: `CI/build-check`
   - Nota: `CI/lint` é executado mas não bloqueia merge (erros existentes no código)
4. **Restrictions**: Sem restrições específicas de usuários

### CODEOWNERS

O arquivo `.github/CODEOWNERS` define que todos os arquivos requerem aprovação de `@Maycon-Rodrigues` antes do merge.

Isso garante que mesmo que outros administradores existam no repositório, a aprovação do owner do código é obrigatória.

## Fluxo de Trabalho Sugerido

1. Crie uma branch a partir de `main`:
   ```bash
   git checkout -b feat/nova-funcionalidade
   ```

2. Faça suas alterações e commits

3. Push para o repositório:
   ```bash
   git push origin feat/nova-funcionalidade
   ```

4. Crie um Pull Request no GitHub
   - O CI será executado automaticamente
   - Aguarde aprovação do code owner (@Maycon-Rodrigues)
   - Aguarde que todos os checks do CI passem

5. Após aprovação e checks passados, o PR pode ser merged

## Verificação da Configuração

Para verificar as regras de proteção atuais:

```bash
gh api repos/ChatPay-Go-Labs-Oficial/SmartPig_Stellar-37o/branches/main/protection
```

## Manutenção

### Atualizar Status Checks

Se você adicionar novos jobs ao CI, atualize a lista de `contexts` nas regras de proteção:

```bash
gh api repos/ChatPay-Go-Labs-Oficial/SmartPig_Stellar-37o/branches/main/protection --method PUT -H "Accept: application/vnd.github+json" --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["CI/lint", "CI/build-check", "NOVO_CHECK"]
  }
}
EOF
```

### Modificar CODEOWNERS

Edite o arquivo `.github/CODEOWNERS` para alterar quem pode aprovar mudanças.

## Troubleshooting

### CI falhando

- Verifique os logs da action na aba "Actions" do GitHub
- Certifique-se de que `npm ci` funciona localmente
- Verifique se dependências estão atualizadas
- Para projetos Expo, verifique se `npx expo doctor` passa localmente

### Não é possível fazer merge

- Verifique se todos os checks do CI passaram
- Verifique se houve aprovação do code owner
- Verifique se o PR está atualizado com a branch main (no strict mode)
