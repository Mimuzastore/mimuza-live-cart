import { NextResponse } from "next/server";
import { addReservation, normalizeUsername } from "../../../../lib/shopify";

export const dynamic = "force-dynamic";

export async function POST(request){
  try{
    const body=await request.json();
    if(!process.env.ADMIN_PASSWORD) return NextResponse.json({error:"ADMIN_PASSWORD não configurada na Vercel."},{status:500});
    if(String(body.password || "") !== process.env.ADMIN_PASSWORD) return NextResponse.json({error:"Mot de passe administrateur incorrect."},{status:401});
    if(!body.title || !body.username || body.price==="") return NextResponse.json({error:"Preencha @TikTok, artigo e preço."},{status:400});

    const draft=await addReservation(body);
    const total=draft.totalPriceSet?.presentmentMoney?.amount || "0.00";
    const currency=draft.totalPriceSet?.presentmentMoney?.currencyCode || draft.presentmentCurrencyCode || "CHF";
    return NextResponse.json({ok:true,username:normalizeUsername(body.username),draftId:draft.id,total,currency});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:e.message || "Erro ao guardar a reserva."},{status:500});
  }
}
