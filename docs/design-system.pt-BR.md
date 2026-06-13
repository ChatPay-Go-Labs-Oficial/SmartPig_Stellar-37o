# Design System PigFi

> English version: [design-system.md](design-system.md)

A fonte de verdade e `constants/theme.ts`. Componentes compartilhados ficam em `components/ui` e `components/layout`.

## Fundamentos

- Interface somente escura com `Colors.background`, `card`, `surface`, `surface2`, `muted` e `border`.
- Papeis de destaque: `primary`, `secondary`, `accent`, `gold`, `neonOrange`, `success` e `destructive`.
- Gradientes compartilhados: `Gradients.primary`, `hot`, `gold` e `card`.
- Escala de raios: `12`, `14`, `16` e pill (`9999`).
- Espacamento baseado em 4 px; o conteudo de tela usa 24 px por padrao no `ScreenContainer`.
- Nunito e carregada por `@expo-google-fonts/nunito` nos pesos de 400 a 900.

Importe tokens em vez de duplicar valores:

```tsx
import { Accent, Colors, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
```

## Tipografia

| Token | Tamanho | Uso comum |
| --- | ---: | --- |
| `FontSize.display` | 35 | Titulo principal da pagina |
| `FontSize.displaySm` | 28 | Titulo compacto |
| `FontSize.heading` | 24 | Titulo de secao |
| `FontSize.subheading` | 18 | Titulo de card |
| `FontSize.body` | 16 | Conteudo principal |
| `FontSize.bodySmall` | 14 | Conteudo de apoio |
| `FontSize.label` | 12 | Labels e metadados |

Use `Font.regular`, `semiBold`, `bold`, `extraBold` e `black`. Nao referencie arquivos locais de fonte diretamente.

## Componentes publicos

| Componente | Contrato |
| --- | --- |
| `Button` | Variantes `primary`, `gold`, `ghost`, `secondary`, `destructive`; tamanhos `sm`, `md`, `lg` |
| `Card` | Variantes `default`, `flat`, `elevated` |
| `Input` | Apresentacao padrao e `glass` |
| `Badge` | `destaque`, `conquista`, `sucesso`, `erro`, `info`, `muted` |
| `GradientText` | Fallback semantico de destaque; atualmente usa cor solida por estabilidade |
| `PressableScale` | Animacao de toque e som global opcional |
| `ScreenContainer` | Safe area com modos rolavel e fixo |

Use o componente exportado antes de criar uma alternativa local na tela. Adicione variantes somente quando representarem um papel semantico repetido.

## Interacao e feedback

- `PressableScale` fornece animacao de toque e som.
- Navegacao e resultados importantes podem adicionar feedback haptico.
- `useSound` centraliza sons e respeita a preferencia persistida de silencio.
- Reanimated e usado em animacoes mais ricas do mascote, celebracoes e licoes.
- O feedback nao pode depender apenas de som, cor ou animacao; mantenha texto ou estado visivel.

## Regras de layout

- Use `ScreenContainer` nas telas padrao.
- Respeite safe areas e reserve espaco para a barra inferior flutuante.
- Use tokens de espacamento em componentes reutilizaveis; artes isoladas podem usar valores explicitos.
- Diferencie valores financeiros e status de operacao do conteudo decorativo.
- Use linguagem simples e evite jargao blockchain no texto principal da interface.

## Acessibilidade e manutencao

- Forneca labels para acoes apenas com icone.
- Preserve contraste legivel nas superficies escuras.
- Use estados desabilitado e carregando em acoes assincronas.
- Nao indique sucesso antes da confirmacao remota da operacao.
- Atualize `constants/theme.ts`, este documento e as duas versoes de idioma quando o contrato publico de tokens/componentes mudar.
