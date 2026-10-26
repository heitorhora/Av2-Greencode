# greencode — AV2 (servidor monolítico)

API REST + front SPA para logística reversa de resíduos eletroeletrônicos.
Stack: **Node.js 20+ · TypeScript · Fastify · Prisma ORM · PostgreSQL · JWT**.
Requer **Node.js 20.12+** (o `apt` do Ubuntu 24.04 traz o Node 18: instale o 20 ou 22 via [nvm](https://github.com/nvm-sh/nvm) ou NodeSource). Roda em Windows 10+, Ubuntu 24.04+ e derivados (só JS puro e Docker/PostgreSQL; `bcryptjs` em vez de `bcrypt` evita compilar módulo nativo).

## Como rodar

```bash
cp .env.example .env            # Windows: copy .env.example .env
docker compose up -d            # PostgreSQL 16 (ou use um Postgres seu e ajuste DATABASE_URL)
npm install
npx prisma migrate deploy       # aplica prisma/migrations/*_init (tabelas + CHECKs + trigger de auditoria)
npx prisma generate
npm run db:seed                 # admin / operador / gestor / auditor, senha admin123
npm run dev                     # http://localhost:3000  ·  API documentada em /docs (Swagger UI)
npm test                        # regras de domínio (sem banco)
```

Produção: `npm run build && npm run db:deploy && npm start`. A porta vem de `PORT`; `SIGINT`/`SIGTERM` fazem *graceful shutdown* (fecha o servidor, espera requisições ativas, desconecta o Prisma; trava de 10 s).

## O que mudou em relação à AV1

| AV1 (CLI) | AV2 |
|---|---|
| Usuário não podia ser editado | `PATCH /api/usuarios/:id` (admin: nome, e-mail, papel, ativar/desativar, redefinir senha) e `PATCH /api/me` (perfil + troca de senha com senha atual) |
| Arquivos `.enc` + journal | PostgreSQL, tabelas normalizadas, tabela `Auditoria` imutável (trigger) |
| Sessão em memória | JWT (8 h) com id e papel; hook global protege toda rota `/api`; papel e `ativo` são relidos do banco a cada requisição |
| Sem edição de dados | Edição de organização (inclui contrato), lote e cadastro de equipamento |
| Menu de terminal | SPA em `public/index.html` servida pelo próprio monólito (painel com gráficos, linha do tempo do equipamento, auditoria, parâmetros) |

## Arquitetura (Controller → Service → Repository)

```
src/controllers   HTTP: rotas, JSON Schema (validação), preHandler de auth/permissão
src/services      regra de negócio, transações ($transaction), auditoria
src/repositories  único lugar que fala com o Prisma Client
src/domain        regras puras da AV1 reaproveitadas: Validador*, CNPJ, EquipamentoBase + Factory (polimorfismo)
src/plugins       autenticação JWT
```

Regras e rotas de negócio não conhecem HTTP; trocar Fastify por CLI/mensageria só mexe em `controllers`.

## Decisões e trade-offs

- **Monólito**: um deploy, uma transação cobrindo tudo (lote + equipamentos + auditoria), depuração simples. Custo: escala vertical e acoplamento de deploy; a divisão por camadas deixa `auditoria`/`relatorios` prontos para serem extraídos se o volume pedir.
- **Fastify (não Express)**: validação por JSON Schema nativa (corpo inválido nunca chega ao serviço; campos extras são removidos), plugins encapsulados, menor overhead.
- **JWT stateless + releitura do usuário**: o token leva id e papel, mas JWT puro só perderia efeito ao expirar; por isso ler `ativo`/`papel` a cada requisição custa 1 consulta por chave primária e faz desativação e mudança de papel valerem na hora. Alternativa rejeitada: lista de revogação (mais estado para manter).
- **bcryptjs**: ~30% mais lento que o `bcrypt` nativo, mas sem `node-gyp`, requisito para instalar igual em Windows e Ubuntu.
- **Concorrência otimista**: toda entidade editável tem `versao` (`Usuario`, `Organizacao`, `Lote`, `Equipamento`); `Contrato` é editado dentro da `Organizacao` e fica protegido pela versão dela, e `Movimentacao`, `HistoricoEstado` e `Auditoria` só recebem inserções, então não têm o que perder; o cliente envia a versão que leu e `UPDATE ... WHERE id AND versao` incrementa; 0 linhas ⇒ `409`. Evita *lost update* sem travar linhas. Custo: o cliente precisa tratar 409.
- **Transações**: triagem (estado + status + histórico + movimentação + auditoria), criação de lote com equipamentos, qualquer escrita auditada. Edição de usuário usa isolamento `Serializable` para que dois admins não se rebaixem ao mesmo tempo e deixem o sistema sem administrador.
- **Integridade no banco, não só no código**: `UNIQUE` em CNPJ, `codigoBarrasInterno`, username, e-mail, nº de contrato; FKs (inclusive `usuarioId` de movimentação e histórico); `CHECK` de estado físico (0–4) e vigência; trigger torna `Auditoria` somente-inserção (no `migration.sql` inicial). A validação da aplicação dá mensagem boa; o banco é a última barreira (P2002/P2003 viram 409/400).
- **Auditoria na mesma transação**: ou o dado muda e é registrado, ou nenhum dos dois.
- **Contrato opcional 1:1** com organização, como pede o enunciado; `clausulas` em `Json` para dados semiestruturados.
- **Freio de força bruta no login** em memória (5 falhas/min por IP+usuário). Limite conhecido: vale por processo; com várias instâncias, usar Redis.
- **Migration escrita à mão**: o `migration.sql` inicial acompanha o `schema.prisma`; se `prisma migrate dev` acusar diferença, rode `npx prisma migrate dev --name ajuste` e mantenha o resultado.
- **Alternativas rejeitadas**: microsserviços (custo operacional sem necessidade nesta fase); `db push` (sem histórico de migração); Express (menos validação nativa).

## Permissões

| Papel | Acesso |
|---|---|
| ADMINISTRADOR | tudo, incluindo usuários e parâmetros |
| OPERADOR_CADASTRO | organizações/contratos, relatório |
| GESTOR_ALMOXARIFADO | lotes, equipamentos, triagem, movimentação; lê organizações |
| AUDITOR | auditoria e relatório (somente leitura) |

## Rotas (`/api`, exceto `/saude`) — documentação interativa em `/docs`

`POST /auth/login` · `GET|PATCH /me` · `GET|POST /usuarios` · `GET|PATCH /usuarios/:id` ·
`GET|POST /organizacoes` · `GET|PATCH|DELETE /organizacoes/:id` ·
`GET|POST /lotes` · `GET|PATCH /lotes/:id` ·
`GET /equipamentos?loteId&status` · `GET|PATCH /equipamentos/:id` · `POST /equipamentos/:id/triagem` · `POST /equipamentos/:id/movimentacao` ·
`GET /painel` · `GET /relatorios/potencial-recuperacao` · `GET /auditoria` · `GET|PUT /config`

Exemplo:
```bash
TOKEN=$(curl -s localhost:3000/api/auth/login -H 'content-type: application/json' -d '{"username":"admin","senha":"admin123"}' | jq -r .token)
curl -X PATCH localhost:3000/api/usuarios/<id> -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"versao":1,"nome":"Novo Nome","papel":"AUDITOR"}'
```

## Diagrama de classes

Atualizado em `docs/UML.md` (Mermaid): domínio da AV1 + camadas Controller/Service/Repository + entidades persistidas.
