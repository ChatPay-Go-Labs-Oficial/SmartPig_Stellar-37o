export type MCQuestion = {
  type: 'mc';
  question: string;
  options: { id: string; text: string }[];
  correctId: string;
  feedbackCorrect: string;
  feedbackWrong: string;
};

export type TFQuestion = {
  type: 'tf';
  statement: string;
  correct: boolean;
  feedback: string;
};

export type MatchQuestion = {
  type: 'match';
  instruction: string;
  pairs: { leftId: string; left: string; rightId: string; right: string }[];
  feedbackCorrect: string;
  feedbackWrong: string;
};

export type OrderQuestion = {
  type: 'order';
  instruction: string;
  items: { id: string; text: string }[];
  correctOrder: string[];
  feedbackCorrect: string;
  feedbackWrong: string;
};

export type TrilhaQuestion = MCQuestion | TFQuestion | MatchQuestion | OrderQuestion;

export interface TrilhaLesson {
  id: number;
  title: string;
  subtitle: string;
  xp: number;
  duration: string;
  icon: string;
  intro: string;
  questions: TrilhaQuestion[];
  completionMessage: string;
}

export const TRILHA_LESSONS: TrilhaLesson[] = [
  {
    id: 1,
    title: 'O que é investir?',
    subtitle: 'Conceitos básicos',
    xp: 20,
    duration: '2 min',
    icon: 'eco',
    intro: 'Investir é simples.\n\nÉ colocar seu dinheiro pra trabalhar enquanto você vive sua vida. Em vez de ficar parado na conta, ele cresce. Todo dia. Mesmo enquanto você dorme.',
    questions: [
      {
        type: 'mc',
        question: 'O que acontece com o dinheiro parado na conta corrente?',
        options: [
          { id: 'a', text: 'Ele cresce automaticamente todo mês' },
          { id: 'b', text: 'Ele perde valor com o tempo por causa da inflação' },
          { id: 'c', text: 'Ele se multiplica se você não mexer nele' },
          { id: 'd', text: 'Ele rende igual à poupança' },
        ],
        correctId: 'b',
        feedbackCorrect: 'Exato! A inflação corrói o poder do dinheiro parado. Guardar é diferente de investir.',
        feedbackWrong: 'Na verdade, dinheiro parado perde valor. A inflação faz tudo ficar mais caro com o tempo.',
      },
      {
        type: 'tf',
        statement: '"Preciso de muito dinheiro para começar a investir."',
        correct: false,
        feedback: 'Falso mesmo! No PigFi você começa com R$10. O hábito importa mais que o valor.',
      },
      {
        type: 'mc',
        question: 'Qual desses é um exemplo de investimento?',
        options: [
          { id: 'a', text: 'Guardar dinheiro embaixo do colchão' },
          { id: 'b', text: 'Deixar tudo na conta corrente' },
          { id: 'c', text: 'Colocar dinheiro em algo que cresce com o tempo' },
          { id: 'd', text: 'Gastar tudo antes do mês acabar' },
        ],
        correctId: 'c',
        feedbackCorrect: 'Perfeito! Investir é fazer o dinheiro trabalhar por você.',
        feedbackWrong: 'Investir é diferente de guardar. Tem que haver crescimento.',
      },
    ],
    completionMessage: 'Você já sabe o básico. Seu porquinho tá orgulhoso.',
  },
  {
    id: 2,
    title: 'Por que o dólar?',
    subtitle: 'Proteção do patrimônio',
    xp: 20,
    duration: '2 min',
    icon: 'attach-money',
    intro: 'O real sobe e desce. O dólar protege.\n\nQuando a economia do Brasil balança, o dólar costuma subir. Guardar em dólar é como ter um escudo contra essa oscilação — sem precisar entender nada de economia.',
    questions: [
      {
        type: 'tf',
        statement: '"O dólar nunca oscila, é sempre estável."',
        correct: false,
        feedback: 'O dólar também oscila, mas historicamente tende a se valorizar frente ao real no longo prazo. É sobre proteção, não garantia.',
      },
      {
        type: 'mc',
        question: 'Por que guardar em dólar pode ser interessante para brasileiros?',
        options: [
          { id: 'a', text: 'Porque o real sempre vai cair' },
          { id: 'b', text: 'Porque diversifica e protege contra a desvalorização do real' },
          { id: 'c', text: 'Porque o dólar nunca perde valor' },
          { id: 'd', text: 'Porque é obrigatório por lei' },
        ],
        correctId: 'b',
        feedbackCorrect: 'Isso! Diversificar moeda é uma forma de proteção — não aposta.',
        feedbackWrong: 'Nenhuma moeda é garantia, mas diversificar protege seu poder de compra.',
      },
      {
        type: 'match',
        instruction: 'Combine cada conceito com a definição correta.',
        pairs: [
          { leftId: 'inflacao', left: 'Inflação', rightId: 'def-inflacao', right: 'Dinheiro compra menos com o tempo' },
          { leftId: 'dolar', left: 'Dólar', rightId: 'def-dolar', right: 'Moeda americana, referência global' },
          { leftId: 'diversificar', left: 'Diversificar', rightId: 'def-diversificar', right: 'Não colocar tudo em um só lugar' },
          { leftId: 'real', left: 'Real', rightId: 'def-real', right: 'Moeda brasileira, sujeita à economia local' },
        ],
        feedbackCorrect: 'Perfeito! Você entende os conceitos fundamentais.',
        feedbackWrong: 'Quase! Revise as definições e tente de novo.',
      },
    ],
    completionMessage: 'Proteção ativa. Seu porquinho já pensa em dólar.',
  },
  {
    id: 3,
    title: 'Como o PigFi funciona?',
    subtitle: 'Passo a passo',
    xp: 20,
    duration: '2 min',
    icon: 'bolt',
    intro: 'É só um Pix. O resto é com a gente.\n\nVocê manda um Pix a partir de R$10. A PigFi converte em dólar e seu porquinho começa a crescer. Sem banco, sem agência, sem burocracia.',
    questions: [
      {
        type: 'order',
        instruction: 'Coloque os passos na ordem correta:',
        items: [
          { id: '1', text: 'Baixa o app e cria sua conta' },
          { id: '2', text: 'Escolhe quanto quer guardar' },
          { id: '3', text: 'Manda um Pix' },
          { id: '4', text: 'Seu dinheiro é convertido em dólar' },
          { id: '5', text: 'Acompanha tudo crescer em tempo real' },
        ],
        correctOrder: ['1', '2', '3', '4', '5'],
        feedbackCorrect: 'Exato! É simples assim. Pix → dólar → crescimento.',
        feedbackWrong: 'Quase! A ordem importa para entender o fluxo completo.',
      },
      {
        type: 'mc',
        question: 'Qual é o valor mínimo para investir no PigFi?',
        options: [
          { id: 'a', text: 'R$50' },
          { id: 'b', text: 'R$100' },
          { id: 'c', text: 'R$10' },
          { id: 'd', text: 'R$1.000' },
        ],
        correctId: 'c',
        feedbackCorrect: 'Isso! R$10. O café que você tomaria amanhã pode virar dólar hoje.',
        feedbackWrong: 'Muito menos que isso! No PigFi você começa com só R$10.',
      },
      {
        type: 'tf',
        statement: '"Preciso entender de câmbio e economia para usar o PigFi."',
        correct: false,
        feedback: 'Falso! A PigFi cuida de tudo isso por você. Você só vê o porquinho crescendo.',
      },
    ],
    completionMessage: 'Agora você entende como funciona. Simples assim.',
  },
  {
    id: 4,
    title: 'Hábito é tudo',
    subtitle: 'Consistência que vence',
    xp: 20,
    duration: '2 min',
    icon: 'repeat',
    intro: 'Não é sobre quanto. É sobre sempre.\n\nGuardar R$10 todo mês por 12 meses é melhor do que guardar R$200 uma vez e esquecer. O hábito constrói mais do que o valor.',
    questions: [
      {
        type: 'mc',
        question: 'Qual dessas atitudes gera mais resultado no longo prazo?',
        options: [
          { id: 'a', text: 'Guardar R$500 uma vez por ano' },
          { id: 'b', text: 'Esperar ter bastante dinheiro para começar' },
          { id: 'c', text: 'Guardar R$10 todo mês, sem falhar' },
          { id: 'd', text: 'Investir só quando a economia está boa' },
        ],
        correctId: 'c',
        feedbackCorrect: 'Exato! Consistência bate valor. Todo mês, sem desculpa.',
        feedbackWrong: 'Constância é mais poderosa que quantia. Comece pequeno, mas comece.',
      },
      {
        type: 'tf',
        statement: '"É melhor esperar sobrar dinheiro para começar a investir."',
        correct: false,
        feedback: 'Dinheiro raramente "sobra". O hábito é separar antes de gastar, não depois.',
      },
      {
        type: 'match',
        instruction: 'Combine o comportamento com o resultado esperado.',
        pairs: [
          { leftId: 'guardar-mes', left: 'Guardar todo mês', rightId: 'habito-solido', right: 'Hábito sólido e crescimento consistente' },
          { leftId: 'esperar-certo', left: 'Esperar o momento certo', rightId: 'nunca-comeca', right: 'Nunca começa' },
          { leftId: 'guardar-vez', left: 'Guardar uma vez', rightId: 'resultado-pontual', right: 'Resultado pontual, sem evolução' },
          { leftId: 'aumentar-valor', left: 'Aumentar aos poucos', rightId: 'aceleracao', right: 'Aceleração natural do crescimento' },
        ],
        feedbackCorrect: 'Perfeito! Você entende o poder do hábito.',
        feedbackWrong: 'Quase! Pense nas consequências de cada comportamento.',
      },
    ],
    completionMessage: 'Hábito formado. Seu porquinho agradece a consistência.',
  },
  {
    id: 5,
    title: 'Seu porquinho, suas regras',
    subtitle: 'Você no controle',
    xp: 20,
    duration: '2 min',
    icon: 'savings',
    intro: 'Você no controle.\n\nNo PigFi, você define o ritmo. Quer guardar mais esse mês? Guarda. Quer pausar? Pausa. Quer sacar? É seu dinheiro. A ideia é que investir se encaixe na sua vida — não o contrário.',
    questions: [
      {
        type: 'mc',
        question: 'O que você pode fazer com seu dinheiro no PigFi?',
        options: [
          { id: 'a', text: 'Só pode sacar depois de 1 ano' },
          { id: 'b', text: 'Precisa guardar um valor fixo todo mês' },
          { id: 'c', text: 'Pode guardar, pausar ou sacar quando quiser' },
          { id: 'd', text: 'Não pode alterar o valor após o primeiro Pix' },
        ],
        correctId: 'c',
        feedbackCorrect: 'Isso! Flexibilidade total. Seu dinheiro, suas regras.',
        feedbackWrong: 'No PigFi você tem controle total. Sem travas, sem obrigações.',
      },
      {
        type: 'tf',
        statement: '"Quanto mais meu porquinho cresce, mais recompensas aparecem no app."',
        correct: true,
        feedback: 'Verdade! Metas, fases e conquistas aparecem conforme você evolui. Investir virou jogo.',
      },
      {
        type: 'mc',
        question: 'Qual é o grande diferencial do PigFi?',
        options: [
          { id: 'a', text: 'Rentabilidade garantida acima de tudo' },
          { id: 'b', text: 'Foco em investidores experientes' },
          { id: 'c', text: 'Processo burocrático com mais segurança' },
          { id: 'd', text: 'Simplicidade, gamificação e acessibilidade a partir de R$10' },
        ],
        correctId: 'd',
        feedbackCorrect: 'Perfeito! Simples, divertido e acessível. Esse é o PigFi.',
        feedbackWrong: 'O diferencial é a experiência: simples, gamificada e para todo mundo.',
      },
    ],
    completionMessage: 'Trilha completa! Você entende o PigFi de ponta a ponta.',
  },
];
