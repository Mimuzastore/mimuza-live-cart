# Mimuza LIVE Cart

Aplicação privada da Mimuza Store para gerir reservas de TikTok LIVE usando Draft Orders da Shopify.

## O que faz
- Painel `/admin` para adicionar `@TikTok + artigo + tamanho + cor + preço`.
- Um único carrinho por @TikTok.
- Os artigos podem ser itens personalizados: não precisam de estar publicados no site.
- Página pública `/` onde a cliente escreve o @TikTok.
- Mostra os artigos, total e o `invoiceUrl` seguro da Shopify para concluir a compra.
- Não usa base de dados externa: as reservas são Draft Orders na própria Shopify.

## Variáveis Vercel necessárias
- `SHOPIFY_SHOP` — apenas o subdomínio da loja, sem `.myshopify.com`
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `ADMIN_PASSWORD` — uma palavra-passe forte só para o painel `/admin`

## Permissões Shopify necessárias
Na versão da app no Dev Dashboard:
- `read_draft_orders`
- `write_draft_orders`

Depois publique a versão e instale/atualize a app na sua loja.

## Segurança
Nunca coloque `SHOPIFY_CLIENT_SECRET` dentro do GitHub. Guarde-o apenas nas Environment Variables da Vercel.
