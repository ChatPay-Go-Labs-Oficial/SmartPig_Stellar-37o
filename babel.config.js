// O design usa tamanhos fixos (fontSize, height de botões) que quebram
// quando o SO aplica o multiplicador de "Tamanho de fonte" do usuário. O
// truque clássico de `Text.defaultProps.allowFontScaling = false` não
// funciona aqui porque o babel-preset-expo usa jsxRuntime: 'automatic' por
// padrão — <Text> compila para jsx(Text, {...}), e essa função do
// react/jsx-runtime não faz merge de defaultProps (só React.createElement
// clássico fazia isso). Por isso o plugin injeta allowFontScaling={false}
// direto na árvore JSX, em tempo de build, cobrindo todo <Text>/<TextInput>
// do app sem precisar tocar em cada arquivo.
function disableFontScalingPlugin({ types: t }) {
  const TARGET_TAGS = new Set(['Text', 'TextInput']);

  return {
    visitor: {
      JSXOpeningElement(path) {
        const { name } = path.node;
        if (name.type !== 'JSXIdentifier' || !TARGET_TAGS.has(name.name)) return;

        const alreadySet = path.node.attributes.some(
          (attr) => t.isJSXAttribute(attr) && attr.name.name === 'allowFontScaling',
        );
        if (alreadySet) return;

        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('allowFontScaling'),
            t.jsxExpressionContainer(t.booleanLiteral(false)),
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
    plugins: [disableFontScalingPlugin],
  };
};
