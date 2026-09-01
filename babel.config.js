// O design usa tamanhos fixos (fontSize, height de botões) que quebram quando o
// SO aplica o multiplicador de "Tamanho de fonte" do usuário. A primeira versão
// deste plugin travava a escala de vez com allowFontScaling={false}, o que
// protegia o layout mas tirava a acessibilidade: quem aumenta a fonte do
// aparelho por necessidade de visão não conseguia aumentar nada no app.
//
// Agora o plugin limita em vez de travar: a fonte do sistema volta a valer, mas
// só até MAX_FONT_SCALE. É o meio-termo — o layout aguenta o teto, e quem
// precisa de texto maior é atendido.
//
// Por que um plugin de build e não Text.defaultProps: o babel-preset-expo usa
// jsxRuntime: 'automatic' por padrão, então <Text> compila para jsx(Text, {...})
// via react/jsx-runtime, que não faz merge de defaultProps (só o
// React.createElement clássico fazia). Injetar na árvore JSX cobre todo
// <Text>/<TextInput> do app sem tocar em cada arquivo.
const MAX_FONT_SCALE = 1.3;

function clampFontScalingPlugin({ types: t }) {
  const TARGET_TAGS = new Set(['Text', 'TextInput']);

  return {
    visitor: {
      JSXOpeningElement(path) {
        const { name } = path.node;
        if (name.type !== 'JSXIdentifier' || !TARGET_TAGS.has(name.name)) return;

        const hasProp = (prop) =>
          path.node.attributes.some(
            (attr) => t.isJSXAttribute(attr) && attr.name.name === prop,
          );

        // Respeita quem já decidiu explicitamente. Um allowFontScaling={false}
        // escrito à mão continua valendo: ali o teto seria inócuo, então não
        // injetamos nada.
        if (hasProp('allowFontScaling') || hasProp('maxFontSizeMultiplier')) {
          return;
        }

        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('maxFontSizeMultiplier'),
            t.jsxExpressionContainer(t.numericLiteral(MAX_FONT_SCALE)),
          ),
        );
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [clampFontScalingPlugin],
  };
};
