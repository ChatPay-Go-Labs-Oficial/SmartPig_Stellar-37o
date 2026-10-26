import type { AssetLogoId } from '../AssetIcon';
import type { V2IconName } from '../V2Icon';

// Situação de cada pergunta (Figma, seções "Trilha · Lição 1" a "5", quadro
// "situação"). O texto vem do backend; daqui vem só o desenho: os ícones da
// situação em linha e o arranjo do cartão (Antes/Agora, Opção 1/Opção 2).
// Pergunta nova sem entrada aqui é erro de implementação: conferir no Figma.

export type SituationMark = { icon: V2IconName } | { asset: AssetLogoId };

export type SituationSpec =
  | { kind: 'inline'; marks: readonly SituationMark[] }
  | {
      kind: 'card';
      /** Moeda da linha de cima ("Você tem 10 euros digitais"). */
      header?: AssetLogoId;
      /** pair: rótulo e valor (L1-Q06); triple: rótulo, valor e total. */
      layout: 'pair' | 'triple';
      /** Linha em destaque, com o fundo na cor do app (pelo rótulo). */
      highlight?: string;
      /** Linha só com o total em branco, sem fundo (L5-Q03). */
      emphasize?: string;
    };

export const SITUATIONS: Readonly<Record<string, SituationSpec>> = {
  'L1-Q01': { kind: 'inline', marks: [{ icon: 'pix' }] },
  'L1-Q02': { kind: 'inline', marks: [{ asset: 'USDC' }, { asset: 'EURC' }] },
  'L1-Q03': { kind: 'inline', marks: [{ icon: 'coins' }] },
  'L1-Q04': { kind: 'inline', marks: [{ icon: 'settings' }] },
  'L1-Q05': { kind: 'inline', marks: [{ icon: 'clock' }] },
  'L1-Q06': { kind: 'card', layout: 'pair', highlight: 'Seu saldo' },
  'L2-Q01': { kind: 'inline', marks: [{ asset: 'USDC' }] },
  'L2-Q02': { kind: 'inline', marks: [{ icon: 'piggy' }] },
  'L2-Q03': { kind: 'inline', marks: [{ icon: 'piggy' }] },
  'L2-Q04': { kind: 'inline', marks: [{ icon: 'trending' }] },
  'L2-Q05': { kind: 'inline', marks: [{ icon: 'check' }] },
  'L2-Q06': { kind: 'inline', marks: [{ icon: 'star' }] },
  'L3-Q01': { kind: 'card', layout: 'triple', header: 'EURC', highlight: 'Agora' },
  'L3-Q02': { kind: 'inline', marks: [{ asset: 'USDC' }, { asset: 'EURC' }] },
  'L3-Q03': { kind: 'inline', marks: [{ icon: 'coins' }] },
  'L3-Q04': { kind: 'inline', marks: [{ asset: 'EURC' }] },
  'L3-Q05': { kind: 'inline', marks: [{ asset: 'EURC' }] },
  'L3-Q06': { kind: 'inline', marks: [{ icon: 'clock' }] },
  'L4-Q01': { kind: 'inline', marks: [{ asset: 'XLM' }, { asset: 'USDC' }] },
  'L4-Q02': { kind: 'card', layout: 'triple', header: 'XLM', highlight: 'Agora' },
  'L4-Q03': { kind: 'card', layout: 'triple', highlight: 'Agora' },
  'L4-Q04': { kind: 'inline', marks: [{ icon: 'trending' }] },
  'L4-Q05': { kind: 'inline', marks: [{ icon: 'graduation' }] },
  'L4-Q06': { kind: 'inline', marks: [{ asset: 'XLM' }] },
  'L5-Q01': { kind: 'inline', marks: [{ asset: 'XLM' }] },
  'L5-Q02': { kind: 'inline', marks: [{ icon: 'clock' }] },
  'L5-Q03': { kind: 'card', layout: 'triple', emphasize: 'Opção 2' },
  'L5-Q04': { kind: 'inline', marks: [{ icon: 'alert' }] },
  'L5-Q05': { kind: 'inline', marks: [{ icon: 'book' }] },
  'L5-Q06': { kind: 'inline', marks: [{ icon: 'piggy' }] },
};

export type CardLine =
  | { kind: 'header'; text: string }
  | { kind: 'row'; label: string; value: string; total: string | null };

/**
 * Uma linha do cartão do backend no arranjo do Figma: "Antes: 1 euro = R$5 ·
 * cerca de R$50" vira rótulo "Antes", valor "1 euro = R$5" e total "≈ R$50".
 * O total vem depois de " · ", " = " ou ", "; linha sem rótulo é o topo.
 */
export function parseCardLine(line: string): CardLine {
  const colon = line.indexOf(': ');
  if (colon < 0) return { kind: 'header', text: line };
  const label = line.slice(0, colon);
  const rest = line.slice(colon + 2);
  for (const separator of [' · ', ' = ', ', ']) {
    const at = rest.indexOf(separator);
    if (at >= 0) {
      const total = rest.slice(at + separator.length).replace(/^cerca de /, '≈ ');
      return { kind: 'row', label, value: rest.slice(0, at), total };
    }
  }
  return { kind: 'row', label, value: rest, total: null };
}
