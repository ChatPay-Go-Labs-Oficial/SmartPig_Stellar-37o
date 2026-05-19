export interface Flashcard {
  id: number;
  title: string;
  content: string;
  emoji: string;
  color: readonly [string, string];
}

export const flashcards: Flashcard[] = [
  {
    id: 1,
    title: 'O que é DeFi?',
    content: 'DeFi (Finanças Descentralizadas) são serviços financeiros que funcionam sem bancos. Seu dinheiro é gerenciado por contratos inteligentes — programas automáticos que nunca dormem e não cobram taxas abusivas.',
    emoji: '🏦',
    color: ['hsl(260, 60%, 50%)', 'hsl(280, 60%, 40%)'] as const,
  },
  {
    id: 2,
    title: 'Como funciona o Yield Farming?',
    content: 'Yield Farming é como "plantar" seu dinheiro em um cofre digital e colher rendimentos todo dia. Você empresta seus recursos para protocolos DeFi, que pagam juros automaticamente. É a poupança do futuro!',
    emoji: '🌾',
    color: ['hsl(160, 60%, 45%)', 'hsl(140, 60%, 40%)'] as const,
  },
  {
    id: 3,
    title: 'Staking — Rendimento Passivo',
    content: 'Staking é como deixar seu dinheiro "trabalhando" para validar transações na blockchain. Em troca, você recebe recompensas diárias. No PigFi, seu saldo rende automaticamente via Blend na Stellar.',
    emoji: '⛏️',
    color: ['hsl(40, 80%, 50%)', 'hsl(20, 80%, 45%)'] as const,
  },
  {
    id: 4,
    title: 'O que é a Stellar?',
    content: 'Stellar é uma rede blockchain ultra-rápida que processa milhares de transações por segundo, com taxas quase zero. É a "rodovia expressa" das criptomoedas — seu dinheiro viaja por ela de forma invisível e instantânea.',
    emoji: '⚡',
    color: ['hsl(270, 60%, 50%)', 'hsl(240, 60%, 45%)'] as const,
  },
  {
    id: 5,
    title: 'Blend Protocol — Cofres Inteligentes',
    content: 'Seus reais são convertidos automaticamente e depositados no Blend Protocol na Stellar. Esse protocolo usa estratégias DeFi avançadas para maximizar seu rendimento 24h por dia, sem você precisar fazer nada.',
    emoji: '🏛️',
    color: ['hsl(190, 70%, 45%)', 'hsl(220, 70%, 45%)'] as const,
  },
  {
    id: 6,
    title: 'Liquidez — Por que Seus Reais Rendem',
    content: 'Quando você deposita no PigFi, seu dinheiro entra em pools de liquidez. Outros usuários usam essa liquidez para trocar tokens, e você recebe uma parte das taxas. Quanto mais gente usa, mais você ganha!',
    emoji: '💧',
    color: ['hsl(210, 70%, 50%)', 'hsl(190, 70%, 45%)'] as const,
  },
  {
    id: 7,
    title: 'Smart Contracts — Contratos Automáticos',
    content: 'Smart Contracts são programas que executam automaticamente quando certas condições são atendidas. Não precisam de intermediários. É como um contrato que se cumpre sozinho — sem burocracia, sem atrasos.',
    emoji: '📜',
    color: ['hsl(330, 70%, 50%)', 'hsl(350, 70%, 45%)'] as const,
  },
  {
    id: 8,
    title: 'Stellar vs Banco Tradicional',
    content: 'Bancos demoram 1-3 dias para transferências e cobram taxas. Na Stellar, transações acontecem em menos de 1 segundo e custam centavos. Seu dinheiro rende 24/7, não só em dias úteis.',
    emoji: '🏎️',
    color: ['hsl(0, 70%, 50%)', 'hsl(20, 70%, 45%)'] as const,
  },
  {
    id: 9,
    title: 'Risco vs Poupança Tradicional',
    content: 'A poupança rende 6.17% ao ano, mas perde para a inflação. DeFi oferece rendimentos similares ou maiores, com a vantagem de transparência total — você vê exatamente onde seu dinheiro está, em tempo real.',
    emoji: '⚖️',
    color: ['hsl(220, 10%, 40%)', 'hsl(220, 10%, 35%)'] as const,
  },
  {
    id: 10,
    title: 'Taxas Zero — Como é Possível?',
    content: 'O PigFi não cobra taxas de depósito ou saque. O rendimento que mostramos já é líquido. Ganhamos uma pequena parte do yield gerado, alinhando nosso sucesso com o seu. Quando você ganha, nós ganhamos.',
    emoji: '🎉',
    color: ['hsl(300, 70%, 50%)', 'hsl(330, 70%, 45%)'] as const,
  },
  {
    id: 11,
    title: 'Carteira Digital Invisível',
    content: 'Ao criar sua conta, uma carteira digital é criada automaticamente para você. Você não precisa guardar senhas complicadas nem entender de blockchain. Tudo acontece nos bastidores — simples como um app de banco.',
    emoji: '👛',
    color: ['hsl(170, 60%, 45%)', 'hsl(150, 60%, 40%)'] as const,
  },
  {
    id: 12,
    title: 'O Futuro das Finanças',
    content: 'DeFi está revolucionando como o dinheiro funciona. Sem intermediários, sem burocracia, sem fronteiras. O PigFi é a porta de entrada mais simples para esse mundo — seu porquinho cuida de tudo para você! 🐷',
    emoji: '🚀',
    color: ['hsl(250, 60%, 50%)', 'hsl(270, 60%, 45%)'] as const,
  },
];
