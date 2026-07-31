# 🧭 Roteiro Rio Interativo

Um app de roteiro de viagem em mapa, **mobile-first**, para usar no celular andando
pelo Rio. Sem backend — tudo roda no navegador e fica salvo no aparelho.

Feito para uma viagem específica (chegada 4/8, saída 9/8), mas é totalmente editável:
adicione, remova, reordene arrastando, mova paradas entre dias e otimize a ordem.

## Rodar no computador

```bash
npm install
npm run dev
```

O terminal mostra um endereço `http://localhost:5199` e também um endereço de rede
(algo como `http://192.168.x.x:5199`).

## Usar no celular

1. Deixe o `npm run dev` rodando no computador.
2. Com o celular **na mesma rede Wi-Fi**, abra o endereço de rede que apareceu no
   terminal (o `http://192.168...`).
3. No iPhone (Safari) → Compartilhar → **Adicionar à Tela de Início**. Vira um app de
   verdade, abre em tela cheia e funciona **offline** depois do primeiro carregamento.

## O que dá pra fazer

- 🗺️ **Mapa em tela cheia** com pins de emoji, coloridos por dia e numerados na ordem.
- 📌 **Abas por dia** num painel de baixo; cards arrastáveis (segure o emoji e arraste).
  Tocar num card centraliza o mapa e abre o balão do pin.
- 🔀 Filtro **“Dia atual”** × **“Viagem toda”**.
- 🚶🚗 **Rota real** entre as paradas (via OSRM), com tempo/distância totais e o tempo
  de cada trecho no card. Alterne **a pé / carro** por dia.
- ✏️ **Editar tudo**: nome, emoji, horário, duração, categoria, travar, notas, mover
  entre dias ou pro **banco de ideias** 💡.
- 🔎 **Buscar lugares novos** (Nominatim/OSM) e adicionar a um dia ou ao banco.
- ✨ **Otimizar o dia**: reordena para reduzir o tempo de trânsito, respeitando paradas
  travadas 🔒, a primeira/última (base) e janelas de horário (ex.: Jardim Botânico
  fecha 17h). Mostra o *antes → depois* e dá pra desfazer.
- 💾 **Exportar / importar JSON** e **resetar** pro roteiro original (menu ⋯).

## Sobre os serviços públicos

O app usa serviços gratuitos de demonstração do OpenStreetMap:

- **Nominatim** (busca) — limite de 1 requisição/segundo; por isso a busca tem 1s de
  espera antes de consultar.
- **OSRM** (rotas, via routers do FOSSGIS) — perfis a pé e de carro.

Se algum serviço falhar ou estiver ocupado, o app **não quebra**: cai para uma
estimativa em **linha reta** (mostrada como linha pontilhada / etiqueta “linha reta”).

O mapa mostra a atribuição do OpenStreetMap, como a licença exige.

## Dados iniciais

As coordenadas do roteiro foram resolvidas e conferidas no Nominatim durante o build
e gravadas em [`src/data/seed.ts`](src/data/seed.ts) — todas dentro do município do
Rio. Itens genéricos (café, almoço, noite com as amigas) ficam sem coordenada, como
lembrete de agenda. As bases usam o centro do bairro (endereço real é privado).

## Testes

O otimizador é testado (restrições de lock, primeira/última fixas e janelas de horário):

```bash
npm test
```

## Publicar (GitHub Pages)

Há um workflow pronto em `.github/workflows/deploy.yml` (no seu disco) que publica no
Pages a cada push na `main`. Ele não foi enviado no push inicial porque o token do
`gh` não tinha o escopo `workflow`. Para ativá-lo, uma vez:

```bash
gh auth refresh -h github.com -s workflow
git rm --cached --ignore-unmatch .git/info/exclude >/dev/null 2>&1 || true
git update-index --no-assume-unchanged .github/workflows/deploy.yml 2>/dev/null || true
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Pages deploy workflow"
git push
```

Depois, em **Settings → Pages → Source: GitHub Actions**. O `base` do Vite é ajustado
automaticamente pelo workflow via `VITE_BASE`. (Ou adicione o arquivo pela interface
web do GitHub, que não exige escopo extra.)

## Stack

Vite · React · TypeScript · react-leaflet/Leaflet · @dnd-kit · vite-plugin-pwa ·
Vitest. Sem backend; estado em `localStorage`.
