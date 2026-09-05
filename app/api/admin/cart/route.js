
import { NextResponse } from "next/server";
import {
  findLiveDraft,
  publicDraft,
  normalizeUsername,
  updateLiveDraftItem,
  removeLiveDraftItem
} from "../../../../lib/shopify";

export const dynamic = "force-dynamic";

function checkPassword(body){
  if(!process.env.ADMIN_PASSWORD){
    return NextResponse.json({error:"ADMIN_PASSWORD não configurada na Vercel."},{status:500});
  }
  if(String(body.password || "") !== process.env.ADMIN_PASSWORD){
    return NextResponse.json({error:"Mot de passe administrateur incorrect."},{status:401});
  }
  return null;
}

export async function POST(request){
  try{
    const body=await request.json();
    const authError=checkPassword(body);
    if(authError) return authError;

    const username=normalizeUsername(body.username);
    if(!username) return NextResponse.json({error:"@TikTok inválido."},{status:400});

    const action=String(body.action || "get");

    if(action==="get"){
      const draft=await findLiveDraft(username);
      if(!draft) return NextResponse.json({error:"Aucun panier ouvert trouvé pour cette cliente."},{status:404});
      return NextResponse.json({ok:true,cart:publicDraft(draft,username)});
    }

    const index=Number.parseInt(body.index,10);
    if(!Number.isInteger(index) || index<0){
      return NextResponse.json({error:"Article inválido."},{status:400});
    }

    if(action==="quantity"){
      const quantity=Number.parseInt(body.quantity,10);
      if(!Number.isInteger(quantity) || quantity<1 || quantity>99){
        return NextResponse.json({error:"Quantité invalide."},{status:400});
      }
      const draft=await updateLiveDraftItem(username,index,quantity);
      return NextResponse.json({ok:true,cart:draft ? publicDraft(draft,username) : null});
    }

    if(action==="remove"){
      const draft=await removeLiveDraftItem(username,index);
      return NextResponse.json({ok:true,cart:draft ? publicDraft(draft,username) : null});
    }

    return NextResponse.json({error:"Action inválida."},{status:400});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:e.message || "Erro ao atualizar o carrinho."},{status:500});
  }
}
