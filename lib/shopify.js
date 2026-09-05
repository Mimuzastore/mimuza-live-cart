
const API_VERSION = "2026-07";

let tokenCache = { token: null, expiresAt: 0 };

function env(name){
  const value = process.env[name];
  if(!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function normalizeUsername(value=""){
  return String(value).trim().replace(/^@+/,"").toLowerCase().replace(/[^a-z0-9._-]/g,"");
}

export function usernameTag(username){
  return `livecart_${normalizeUsername(username).replace(/[^a-z0-9_-]/g,"_")}`;
}

async function getToken(){
  if(tokenCache.token && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.token;
  const shop = env("SHOPIFY_SHOP");

  const r = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`,{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({
      grant_type:"client_credentials",
      client_id:env("SHOPIFY_CLIENT_ID"),
      client_secret:env("SHOPIFY_CLIENT_SECRET")
    }),
    cache:"no-store"
  });

  const data=await r.json();
  if(!r.ok || !data.access_token) throw new Error(data.error_description || data.error || "Shopify authentication failed.");

  tokenCache={token:data.access_token, expiresAt:Date.now() + Number(data.expires_in || 86399)*1000};
  return tokenCache.token;
}

export async function shopifyGraphQL(query,variables={}){
  const shop=env("SHOPIFY_SHOP");
  const token=await getToken();

  const r=await fetch(`https://${shop}.myshopify.com/admin/api/${API_VERSION}/graphql.json`,{
    method:"POST",
    headers:{"Content-Type":"application/json","X-Shopify-Access-Token":token},
    body:JSON.stringify({query,variables}),
    cache:"no-store"
  });

  const json=await r.json();
  if(!r.ok) throw new Error(`Shopify HTTP ${r.status}: ${JSON.stringify(json)}`);
  if(json.errors?.length) throw new Error(json.errors.map(x=>x.message).join(" | "));
  return json.data;
}

export async function findLiveDraft(username){
  const tag=usernameTag(username);
  const q=`tag:${tag} status:open`;

  const data=await shopifyGraphQL(`
    query FindLiveDraft($query:String!){
      draftOrders(first:1, reverse:true, query:$query){
        nodes{
          id name status invoiceUrl presentmentCurrencyCode tags
          totalPriceSet{presentmentMoney{amount currencyCode}}
          lineItems(first:100){
            nodes{
              title quantity custom
              originalUnitPriceWithCurrency{amount currencyCode}
              customAttributes{key value}
            }
          }
        }
      }
    }`,{query:q});

  return data.draftOrders.nodes[0] || null;
}

function attrsToObject(attrs=[]){
  return Object.fromEntries(attrs.map(a=>[a.key,a.value]));
}

export function publicDraft(draft,username){
  const items=(draft.lineItems?.nodes || []).map(li=>{
    const a=attrsToObject(li.customAttributes);
    return {
      title:li.title,
      quantity:li.quantity,
      unitPrice:Number(li.originalUnitPriceWithCurrency?.amount || 0),
      code:a.code || "",
      size:a.size || "",
      color:a.color || ""
    };
  });

  return {
    username:normalizeUsername(username),
    status:draft.status,
    currency:draft.presentmentCurrencyCode || draft.totalPriceSet?.presentmentMoney?.currencyCode || "CHF",
    total:Number(draft.totalPriceSet?.presentmentMoney?.amount || 0),
    invoiceUrl:draft.invoiceUrl || null,
    items
  };
}

function lineItemToInput(li){
  return {
    title:li.title,
    quantity:li.quantity,
    originalUnitPriceWithCurrency:{
      amount:String(li.originalUnitPriceWithCurrency?.amount || "0.00"),
      currencyCode:li.originalUnitPriceWithCurrency?.currencyCode || "CHF"
    },
    requiresShipping:true,
    taxable:true,
    customAttributes:li.customAttributes || []
  };
}

async function replaceLiveDraftItems(existing, lineItems){
  const data=await shopifyGraphQL(`
    mutation UpdateLiveDraft($id:ID!,$input:DraftOrderInput!){
      draftOrderUpdate(id:$id,input:$input){
        draftOrder{
          id name status invoiceUrl presentmentCurrencyCode tags
          totalPriceSet{presentmentMoney{amount currencyCode}}
          lineItems(first:100){
            nodes{
              title quantity custom
              originalUnitPriceWithCurrency{amount currencyCode}
              customAttributes{key value}
            }
          }
        }
        userErrors{field message}
      }
    }`,{id:existing.id,input:{lineItems}});

  const out=data.draftOrderUpdate;
  if(out.userErrors?.length) throw new Error(out.userErrors.map(e=>e.message).join(" | "));
  return out.draftOrder;
}

async function deleteLiveDraft(id){
  const data=await shopifyGraphQL(`
    mutation DeleteLiveDraft($input:DraftOrderDeleteInput!){
      draftOrderDelete(input:$input){
        deletedId
        userErrors{field message}
      }
    }`,{input:{id}});

  const out=data.draftOrderDelete;
  if(out.userErrors?.length) throw new Error(out.userErrors.map(e=>e.message).join(" | "));
  return out.deletedId;
}

export async function updateLiveDraftItem(username,index,quantity){
  const existing=await findLiveDraft(username);
  if(!existing) throw new Error("Aucun panier ouvert trouvé pour cette cliente.");

  const current=(existing.lineItems?.nodes || []).map(lineItemToInput);
  if(index<0 || index>=current.length) throw new Error("Article introuvable.");

  current[index]={...current[index],quantity};
  return replaceLiveDraftItems(existing,current);
}

export async function removeLiveDraftItem(username,index){
  const existing=await findLiveDraft(username);
  if(!existing) throw new Error("Aucun panier ouvert trouvé pour cette cliente.");

  const current=(existing.lineItems?.nodes || []).map(lineItemToInput);
  if(index<0 || index>=current.length) throw new Error("Article introuvable.");

  current.splice(index,1);

  if(current.length===0){
    await deleteLiveDraft(existing.id);
    return null;
  }

  return replaceLiveDraftItems(existing,current);
}

export async function addReservation({username,code,title,color,size,price,quantity}){
  username=normalizeUsername(username);
  if(!username) throw new Error("Username TikTok inválido.");

  const qty=Math.max(1,Number.parseInt(quantity || 1,10));
  const unit=Number(price);
  if(!Number.isFinite(unit) || unit<0) throw new Error("Preço inválido.");

  const existing=await findLiveDraft(username);

  const newItem={
    title:String(title).trim(),
    quantity:qty,
    originalUnitPriceWithCurrency:{amount:unit.toFixed(2),currencyCode:"CHF"},
    requiresShipping:true,
    taxable:true,
    customAttributes:[
      {key:"code",value:String(code||"")},
      {key:"size",value:String(size||"")},
      {key:"color",value:String(color||"")}
    ]
  };

  if(!existing){
    const data=await shopifyGraphQL(`
      mutation CreateLiveDraft($input:DraftOrderInput!){
        draftOrderCreate(input:$input){
          draftOrder{
            id status invoiceUrl presentmentCurrencyCode
            totalPriceSet{presentmentMoney{amount currencyCode}}
          }
          userErrors{field message}
        }
      }`,{input:{
        note:`TikTok LIVE reservation @${username}`,
        tags:["LIVE_CART",usernameTag(username)],
        presentmentCurrencyCode:"CHF",
        customAttributes:[{key:"tiktok_username",value:username}],
        lineItems:[newItem]
      }});

    const out=data.draftOrderCreate;
    if(out.userErrors?.length) throw new Error(out.userErrors.map(e=>e.message).join(" | "));
    return out.draftOrder;
  }

  const current=(existing.lineItems?.nodes || []).map(lineItemToInput);

  const data=await shopifyGraphQL(`
    mutation UpdateLiveDraft($id:ID!,$input:DraftOrderInput!){
      draftOrderUpdate(id:$id,input:$input){
        draftOrder{
          id status invoiceUrl presentmentCurrencyCode
          totalPriceSet{presentmentMoney{amount currencyCode}}
        }
        userErrors{field message}
      }
    }`,{id:existing.id,input:{lineItems:[...current,newItem]}});

  const out=data.draftOrderUpdate;
  if(out.userErrors?.length) throw new Error(out.userErrors.map(e=>e.message).join(" | "));
  return out.draftOrder;
}
