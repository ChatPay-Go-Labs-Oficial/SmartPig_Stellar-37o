import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BalanceCard,
  CaseCards,
  Checklist,
  CoinGrid,
  CoinList,
  ConditionCard,
  Equation,
  Equivalences,
  NoticeCard,
  OptionCards,
  QuestionList,
  QuoteCard,
  SplitCard,
  StepChips,
  StepList,
  ValueCard,
} from './patterns';

// Visual de cada tela da lição (Figma, seções "Trilha · Lição 1" a "5"). O
// campo `visual` do backend só descreve o desenho; o desenho é este registro,
// por chave de tela, com os padrões da D1. Chave sem entrada aqui é erro de
// implementação: conferir contra a lista de padrões da D1.

type ScreenVisual = () => ReactElement;

const SCREEN_VISUALS: Readonly<Record<string, ScreenVisual>> = {
  // ─── Lição 1 · Fundamentos ─────────────────────────────────────────────────
  'L1-T01': () => (
    <NoticeCard mark={{ icon: 'pix' }} title="Pix recebido" caption="Agora há pouco" value="+R$20" />
  ),
  'L1-T02': () => (
    <CaseCards
      cases={[
        { tone: 'neutral', mark: { icon: 'book' }, title: 'Registro do banco', caption: 'Só o banco anota e confere' },
        { tone: 'accent', copies: 'monitor', title: 'Muitas cópias', caption: 'Conferidas por muitos computadores' },
      ]}
    />
  ),
  'L1-T03': () => (
    <Equivalences
      rows={[
        { asset: 'USDC', digital: '1 dólar digital', plain: '1 dólar' },
        { asset: 'EURC', digital: '1 euro digital', plain: '1 euro' },
      ]}
    />
  ),
  'L1-T04': () => (
    <CaseCards
      link={{ kind: 'arrow' }}
      cases={[
        { tone: 'neutral', mark: { icon: 'receipt' }, title: 'Comprovante', caption: 'Fica com você' },
        // Espaço de largura zero depois do hífen: sem largura, o Android partia
        // a palavra no meio ("Guarda-volume / s").
        { tone: 'accent', mark: { icon: 'package' }, title: 'Guarda-​volumes', caption: 'A caixa fica guardada' },
      ]}
    />
  ),
  'L1-T05': () => (
    <ConditionCard
      mark={{ icon: 'coins' }}
      tone="gold"
      title="Ouro guardado"
      caption="A moeda digital representa o ouro"
      footer="O preço do ouro sobe e desce"
    />
  ),
  'L1-T06': () => (
    <View style={styles.stack}>
      <CaseCards
        cases={[
          { tone: 'neutral', mark: { icon: 'cup-soda' }, title: 'Máquina de bebidas', caption: 'Segue as regras' },
          { tone: 'accent', mark: { icon: 'settings' }, title: 'Programa na rede', caption: 'Segue as regras' },
        ]}
      />
      <StepChips steps={['Escolher', 'Pagar', 'Entregar']} />
    </View>
  ),
  'L1-T07': () => (
    <CaseCards
      cases={[
        {
          tone: 'accent',
          mark: { icon: 'wallet' },
          title: 'R$100 na mão',
          tag: { label: 'Pronto para usar', icon: 'check', tone: 'accent' },
        },
        {
          tone: 'neutral',
          mark: { icon: 'package' },
          title: 'Objeto de R$100',
          tag: { label: 'Precisa vender', icon: 'clock' },
        },
      ]}
    />
  ),

  // ─── Lição 2 · Como o dinheiro entra e sai ─────────────────────────────────
  'L2-T01': () => (
    <StepList
      link={14}
      steps={[
        { mark: { icon: 'pix' }, tone: 'accent', label: 'Depositar pelo Pix' },
        { mark: { asset: 'USDC' }, tone: 'neutral', label: 'Dólar digital na carteira' },
        { mark: { icon: 'piggy' }, tone: 'neutral', label: 'Guardar no porquinho' },
      ]}
    />
  ),
  'L2-T02': () => (
    <CaseCards
      link={{ kind: 'label', label: 'Guardar' }}
      cases={[
        { tone: 'neutral', mark: { icon: 'wallet' }, title: 'Carteira', caption: 'Recebe e movimenta suas moedas' },
        { tone: 'accent', mark: { icon: 'piggy' }, title: 'Porquinho', caption: 'Uma moeda e regras próprias' },
      ]}
    />
  ),
  'L2-T03': () => (
    <CaseCards
      link={{ kind: 'roundtrip', out: 'Empresta', back: '+ juros' }}
      cases={[
        { tone: 'accent', mark: { icon: 'piggy' }, title: 'Porquinho', caption: 'Empresta o dinheiro guardado' },
        { tone: 'neutral', mark: { icon: 'user' }, title: 'Quem pega emprestado', caption: 'Devolve com juros' },
      ]}
    />
  ),
  'L2-T04': () => (
    <ValueCard
      tag={{ label: '5% ao ano', icon: 'trending' }}
      left={{ label: 'Hoje', value: '100 moedas' }}
      center="trending"
      right={{ label: 'Em um ano', value: 'cerca de 105' }}
      size={19}
      footer={{ icon: 'info', text: 'Se a taxa não mudar' }}
    />
  ),
  'L2-T05': () => (
    <Checklist
      title="Confira antes de confirmar"
      items={['Moeda', 'Quantidade', 'Destino', 'Cobranças']}
      action="Confirmar"
    />
  ),
  'L2-T06': () => (
    <CaseCards
      cases={[
        { tone: 'neutral', mark: { mascot: true }, title: 'Nível do porquinho', caption: 'Acompanha o valor guardado' },
        {
          tone: 'accent',
          mark: { icon: 'star' },
          title: 'Nível de Usuário',
          caption: 'Acompanha o seu aprendizado',
          tag: { label: 'XP não é dinheiro', icon: 'info' },
        },
      ]}
    />
  ),

  // ─── Lição 3 · Misturando dólar e euro ─────────────────────────────────────
  'L3-T01': () => (
    <CaseCards
      sameHeight={false}
      cases={[
        { tone: 'neutral', mark: { asset: 'EURC' }, title: 'Viagem para a Europa', caption: 'Os preços estão em euro' },
        { tone: 'accent', mark: { icon: 'graduation' }, title: 'Curso no Brasil', caption: 'Você paga em reais' },
      ]}
    />
  ),
  'L3-T02': () => (
    <Equivalences rows={[{ asset: 'EURC', digital: '1 euro digital', plain: '1 euro' }]} footer="Em reais: muda" />
  ),
  'L3-T03': () => (
    <ValueCard
      left={{ label: 'Você dá', value: 'R$ 6' }}
      center="refresh-cw"
      right={{ label: 'Você recebe', value: '1 euro', asset: 'EURC' }}
      size={32}
      footer={{ icon: 'arrows', text: 'Amanhã pode ser mais ou menos' }}
    />
  ),
  'L3-T04': () => (
    <SplitCard
      parts={[
        { asset: 'USDC', label: 'Dólar', tone: 'accent' },
        { asset: 'EURC', label: 'Euro', tone: 'neutral' },
      ]}
      caption="Cada moeda pode mudar de preço de um jeito."
    />
  ),
  'L3-T05': () => <CoinGrid lent="9 emprestadas" available="1 disponível" />,
  'L3-T06': () => (
    <StepList
      link={14}
      steps={[
        { mark: { icon: 'piggy' }, tone: 'neutral', label: 'Tirar do porquinho' },
        { mark: { icon: 'refresh-cw' }, tone: 'accent', label: 'Trocar por dólar digital' },
        { mark: { icon: 'pix' }, tone: 'neutral', label: 'Sacar pelo Pix' },
      ]}
    />
  ),
  'L3-T07': () => (
    <CaseCards
      cases={[
        { tone: 'neutral', mark: { icon: 'shield' }, title: 'Lastro', caption: 'Apoia o valor' },
        { tone: 'accent', mark: { icon: 'piggy' }, title: 'Porquinho', caption: 'Onde está guardado' },
      ]}
    />
  ),

  // ─── Lição 4 · Quando o preço oscila ───────────────────────────────────────
  'L4-T01': () => (
    <CoinList
      rows={[
        { asset: 'USDC', label: 'Dólar digital', tag: '≈ 1 dólar' },
        { asset: 'EURC', label: 'Euro digital', tag: '≈ 1 euro' },
        { asset: 'XLM', label: 'Criptomoeda', tag: 'Moeda da rede', gold: true },
      ]}
    />
  ),
  'L4-T02': () => (
    <ConditionCard
      mark={{ icon: 'trending' }}
      tone="gold"
      title="Etiqueta de preço"
      caption="Muda de um dia para o outro"
      footer="Sobe e desce"
      chart
    />
  ),
  'L4-T03': () => (
    <Equation
      blocks={[
        { value: '10', caption: 'unidades' },
        { value: 'R$1', caption: 'cada uma' },
        { value: 'R$10', caption: 'total' },
      ]}
    />
  ),
  'L4-T04': () => (
    <QuestionList
      items={[
        { icon: 'arrow-down', label: 'Se cair, afeta meu plano?' },
        { icon: 'clock', label: 'Quando vou precisar?' },
        { icon: 'arrow-up', label: 'Como faço para tirar?' },
      ]}
    />
  ),

  // ─── Lição 5 · Tirar quando precisar ───────────────────────────────────────
  'L5-T01': () => (
    <StepList
      link={12}
      steps={[
        { mark: { icon: 'piggy' }, tone: 'neutral', label: 'Tirar do porquinho' },
        { mark: { icon: 'refresh-cw' }, tone: 'neutral', label: 'Trocar por dólar digital (se precisar)' },
        { mark: { icon: 'pix' }, tone: 'neutral', label: 'Sacar pelo Pix' },
        { mark: { icon: 'landmark' }, tone: 'accent', label: 'Sua conta no banco' },
      ]}
    />
  ),
  'L5-T02': () => (
    <QuoteCard
      title="Cotação"
      tag={{ label: 'Vale por pouco tempo', icon: 'clock', tone: 'accent' }}
      rows={[
        { label: 'Você entrega', width: 70 },
        { label: 'Você recebe', width: 84 },
        { label: 'Cobranças', width: 48 },
      ]}
    />
  ),
  'L5-T03': () => (
    <OptionCards
      options={[
        { label: 'Opção 1', value: 'R$100', caption: 'menos R$4 de cobranças' },
        { label: 'Opção 2', value: 'R$99', caption: 'menos R$1 de cobranças' },
      ]}
    />
  ),
  'L5-T04': () => (
    <BalanceCard
      asset="EURC"
      title="Porquinho em euro"
      balanceLabel="Saldo"
      action="Tirar"
      tag={{ label: 'Sem cadeado: aprender não bloqueia', icon: 'info' }}
    />
  ),
};

/** O visual da tela, ou null (com aviso em desenvolvimento) se a chave não tem desenho. */
export function screenVisual(screenKey: string): ReactElement | null {
  const Visual = SCREEN_VISUALS[screenKey];
  if (!Visual) {
    if (__DEV__) console.warn(`[lição] Tela ${screenKey} sem visual no registro`);
    return null;
  }
  return <Visual />;
}

const styles = StyleSheet.create({
  // L1-T06: os dois cartões e as etapas, 10 entre eles.
  stack: {
    gap: 10,
  },
});
