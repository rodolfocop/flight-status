# Destino Certo

Aplicativo para pesquisar passagens e hospedagens, salvar resultados e acompanhar preços no computador. Os preços e a disponibilidade são fornecidos por serviços externos; as reservas são concluídas nos sites dos fornecedores.

## Obter o projeto

Com o [Git](https://git-scm.com/downloads) instalado, clone o repositório público e entre na pasta:

```bash
git clone https://github.com/rodolfocop/flight-status.git
cd flight-status
```

## Executar com Docker

Instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/) ou o Docker Engine com Compose. No terminal, dentro da pasta do projeto, execute:

```bash
docker compose up --build -d
```

Abra [http://127.0.0.1:3013](http://127.0.0.1:3013). Para acompanhar os logs, use `docker compose logs -f`; para parar, use `docker compose stop`. Os dados ficam no volume do Docker. Não use `docker compose down -v` se quiser preservá-los.

Como alternativa, instale Node.js 24 ou superior e execute `npm ci` seguido de `npm run local`. Nesse caso, os dados ficam em `.destino-certo/`, separados do volume Docker.

## Configurar e usar

1. Abra **Configurações locais** no aplicativo e informe sua própria chave RapidAPI e a data de início de cada assinatura. Assine separadamente os planos das APIs independentes [Google Flights Live API](https://rapidapi.com/mtnrabi/api/google-flights-live-api) e [Airbnb Live API](https://rapidapi.com/mtnrabi/api/airbnb-live-api). Confira os limites e as condições de cobrança antes de pesquisar.
2. Confira o **Fuso horário** identificado. Pesquise uma viagem para salvar os resultados; abra a viagem salva para consultar voos, hospedagens e histórico. Abrir resultados já salvos não faz uma nova consulta de preços.
3. O acompanhamento é opcional e funciona enquanto o aplicativo estiver em execução. O controle local reserva 10 das 50 consultas de voos para uso manual e limita hospedagens a 100. Consulte a seção **Renovação das franquias**: o contador só reinicia após um horário de renovação confirmado e informado em UTC. O uso em outros aplicativos não é contabilizado.

As credenciais e viagens permanecem no armazenamento local e não são criptografadas em repouso. Não exponha o aplicativo local à internet nem compartilhe o volume ou a pasta de dados. O assistente de IA é opcional; serviços externos precisam de configuração própria e podem ter custos.

## Verificar o projeto

Com Node.js instalado, execute `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. O deploy hospedado é uma etapa futura e está desativado por padrão.

Dados de aeroportos: [OurAirports](https://ourairports.com/data/). Foto de Natal: [Ricαrdo, Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Morro_do_Careca_Natal_Brasil.jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/); imagem adaptada.

Licença do código: [MIT](LICENSE).
