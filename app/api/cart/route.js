import { NextResponse } from "next/server";
import { findLiveDraft, normalizeUsername, publicDraft } from "../../../lib/shopify";

export const dynamic = "force-dynamic";

export async function GET(request){
  try{
    const {searchParams}=new URL(request.url);
    const username=normalizeUsername(searchParams.get("username") || "");
    if(!username) return NextResponse.json({error:"Introduisez un @TikTok valide."},{status:400});
    const draft=await findLiveDraft(username);
    if(!draft) return NextResponse.json({error:"Aucune réservation ouverte trouvée pour ce compte."},{status:404});
    return NextResponse.json(publicDraft(draft,username),{headers:{"Cache-Control":"no-store"}});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:"Impossible de consulter le panier pour le moment."},{status:500});
  }
}
