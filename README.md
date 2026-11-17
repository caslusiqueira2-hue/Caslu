# Nutra

Diário alimentar em português, compatível com Windows e Vercel. Na instalação local, o histórico fica em um arquivo do computador. Na Vercel, o histórico fica no IndexedDB de cada navegador. A análise de fotos, quando autorizada para cada imagem, usa a API do Google Gemini pela internet. Nenhum perfil ou registro alimentar é enviado ao Google.

## Publicar na Vercel

Importe este repositório em **Add New > Project** na Vercel. O arquivo `vercel.json` já define os arquivos estáticos em `public`, o comando `npm run build` e as funções Node.js em `api`. Use a raiz do repositório, sem selecionar a pasta `public` como raiz do projeto. Não é necessário escolher um framework.

Antes de publicar, adicione as variáveis em **Settings > Environment Variables**:

| Variável | Valor |
| --- | --- |
| `GEMINI_API_KEY` | Sua chave privada do Google AI Studio. |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` (opcional, este é o padrão). |
| `APP_PASSWORD` | Uma senha longa e exclusiva para liberar as fotos (prefira ao menos 20 caracteres). |

Acesse o domínio fornecido pela Vercel e abra **Ajustes**. Entre com a senha escolhida em `APP_PASSWORD` para liberar a análise de fotos. A chave Gemini fica somente nas funções do servidor. Sem essas variáveis, busca manual, metas e histórico continuam funcionando, enquanto a análise de fotos fica desabilitada. Alterar variáveis na Vercel exige um novo deploy.

O histórico persiste no mesmo navegador e domínio após fechar a aba ou atualizar o app. Não há sincronização automática entre dispositivos nesta versão. Use **Exportar meus dados** e **Restaurar cópia** para migrar o diário local. Ao mudar de domínio, exporte antes e restaure no novo endereço. Limpar os dados do site ou usar uma janela privada pode apagar os registros do navegador. Supabase não é necessário para esta primeira publicação.

O repositório não deve conter `.env`, dados de usuários ou chaves. `.gitignore` e `.vercelignore` excluem esses arquivos. As funções não usam arquivos temporários da Vercel para persistir o diário.

## Abrir no Windows

Com Node.js 22 ou superior, dê um duplo clique em **Abrir-Nutra.cmd**. Se preferir o terminal, execute `node server.mjs` nesta pasta e abra [localhost:3210](http://localhost:3210). Para encerrar, feche a janela do servidor ou pressione `Ctrl+C`. Não é preciso instalar pacotes ou criar uma conta de banco de dados.

O servidor escuta apenas no próprio computador. O layout se adapta a telas pequenas e o seletor tem suporte à câmera traseira quando o navegador oferece esse recurso. Esta instalação não é acessível pelo celular conectado à mesma rede.

## Uso

1. Abra **Metas** e preencha seu perfil para obter uma referência diária.
2. No **Diário**, escolha a data. Use **Registrar** para buscar alimentos ou **Por foto** para estimar os itens de um prato. Revise sempre o alimento correspondente e os gramas antes de salvar. A foto não é armazenada.
3. Compare **quanto falta para a meta de consumo** com o **saldo do dia em relação à manutenção**. São duas comparações diferentes. A meta de emagrecimento, por exemplo, pode ser 1.950 kcal mesmo quando o gasto estimado é 2.300 kcal.
4. Use **Fechar dia** depois de registrar as refeições. Dia aberto mostra projeção. O dia fechado guarda a classificação com os dados registrados. Editar alimentos reabre o dia. Dias sem alimentos não recebem classificação de déficit.
5. Consulte **Histórico**. A estimativa original dos dias passados permanece separada das alterações posteriores do perfil. Exporte uma cópia em **Ajustes**.

## Base baixada

Os 597 registros são da **Tabela Brasileira de Composição de Alimentos (TACO), NEPA/Unicamp, 4ª edição revisada e ampliada, 2011**. A [planilha original](https://nepa.unicamp.br/publicacoes/tabela-taco-excel/) está em `data/taco-unicamp.xlsx`. O catálogo do app usa a [conversão de Fabio F. Brolesi](https://github.com/brolesi/taco), com atribuição e licença incluídas em `data/`. A base que o app lê é `public/data/foods.json`. Calorias e nutrientes são por 100 g da parte comestível. 590 registros permitem o cálculo de calorias e macros. Os 7 com dados incompletos podem ser consultados, mas precisam de cadastro próprio com os valores do rótulo. Para óleos da tabela com 100 g de gordura por 100 g, proteína e carboidrato são tratados como zero.

## Estimativas de metas

A equação de [Mifflin e St Jeor](https://doi.org/10.1093/ajcn/51.2.241) estima o gasto em repouso. O app multiplica o resultado pelo fator de atividade informado (1,2 a 1,9) para obter a manutenção estimada. Usa como ponto de partida: reduzir até 15% do gasto, limitado a 500 kcal, para emagrecer. Manter o gasto estimado para manutenção. Somar até 8%, limitado a 300 kcal, para ganho de massa junto do treino de força. Esses ajustes são parâmetros do aplicativo e não são prescrições clínicas.

O cálculo de macros usa 1,2 g/kg de proteína para manutenção e 1,6 g/kg para emagrecimento ou ganho, limitados a 35% da energia. Gordura recebe 30% da energia e carboidratos completam o restante. O app utiliza 4/4/9 kcal por grama para distribuir as metas de macro e a energia da própria tabela para alimentar o diário. Na classificação do saldo, a faixa de ±50 kcal aparece como próxima à manutenção, pois o cálculo é aproximado. Ultrapassar a meta de emagrecimento não implica ter ultrapassado a manutenção.

As sugestões são para adultos. A meta automática não é exibida para menores, gestação ou amamentação, situações clínicas sinalizadas, baixo peso ou valores fora da faixa de segurança do produto. O diário pode ser usado sem meta. Referências: [NIDDK](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner), [NIH sobre proteína e exercício](https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/), [Guia Alimentar](https://bvsms.saude.gov.br/bvs/publicacoes/guia_alimentar_populacao_brasileira_2ed.pdf).

## Gemini e dados

O modelo padrão é `gemini-3.1-flash-lite`, com [opção de uso gratuito](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-lite) conforme conta e cotas. A chave fica no arquivo `.env` do servidor, que deve permanecer privado. É possível substituí-la em **Ajustes** ou editar a cópia local de `.env.example` e reiniciar. A resposta da IA propõe nomes e massas. O app calcula os macros com os alimentos confirmados no catálogo. No plano gratuito, o Google pode usar o conteúdo enviado para melhorar os produtos. Envie somente imagens da comida.

O servidor salva o histórico em `data/state.json` e mantém a revisão anterior em `data/state.previous.json`. Em **Ajustes**, o backup pode ser exportado ou restaurado. A instalação é para uso pessoal em um único computador e não oferece contas ou sincronização.

Para rodar os testes: `npm test` (ou `node --test`). Para reconstruir o catálogo, extraia `data/taco-api-estatica.zip` em `data/taco-extraido` e execute `node scripts/import-taco.mjs`.
