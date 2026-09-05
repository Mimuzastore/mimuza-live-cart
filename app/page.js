"use client";
import { useState } from "react";

function money(amount, currency="CHF"){
  return new Intl.NumberFormat("fr-CH",{style:"currency",currency}).format(Number(amount || 0));
}

export default function Home(){
  const [username,setUsername]=useState("");
  const [cart,setCart]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function findCart(e){
    e.preventDefault();
    setLoading(true); setError(""); setCart(null);
    try{
      const r=await fetch(`/api/cart?username=${encodeURIComponent(username)}`,{cache:"no-store"});
      const data=await r.json();
      if(!r.ok) throw new Error(data.error || "Carrinho não encontrado.");
      setCart(data);
    }catch(err){ setError(err.message); }
    finally{ setLoading(false); }
  }

  return <main className="wrap">
    <div className="brand">
      <div className="logoMark">✦</div>
      <h1>MIMUZA</h1>
      <small>STORE</small>
    </div>

    <section className="card">
      <h2>Mon panier LIVE <span className="badge">TikTok</span></h2>
      <p className="subtitle">Introduisez votre nom d’utilisateur TikTok pour consulter vos réservations et finaliser votre achat.</p>
      <form onSubmit={findCart}>
        <label>Nom d’utilisateur TikTok</label>
        <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="@username" autoComplete="off" />
        <button disabled={loading || !username.trim()}>{loading ? "Recherche…" : "Rechercher mon panier"}</button>
      </form>
      {error && <div className="message error">{error}</div>}

      {cart && <div className="card" style={{marginTop:22,boxShadow:"none"}}>
        <div className="adminTop">
          <strong>@{cart.username}</strong>
          <span className="badge">{cart.status}</span>
        </div>
        <div style={{marginTop:10}}>
          {cart.items.map((it,i)=><div className="item" key={i}>
            <div>
              <div className="itemName">{it.title}</div>
              <div className="itemMeta">
                {[it.code && `Code ${it.code}`, it.size && `Taille ${it.size}`, it.color && `Couleur ${it.color}`, `Qté ${it.quantity}`].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="price">{money(it.unitPrice * it.quantity, cart.currency)}</div>
          </div>)}
        </div>
        <div className="total"><span>Total</span><span>{money(cart.total, cart.currency)}</span></div>
        {cart.invoiceUrl
          ? <a className="button" href={cart.invoiceUrl}>Finaliser ma commande</a>
          : <div className="message">Le lien de paiement n’est pas encore disponible. Réessayez dans quelques instants.</div>}
        <div className="help">Les réservations sont conservées selon les conditions annoncées pendant le LIVE.</div>
      </div>}
    </section>
    <footer>© Mimuza Store · LIVE Cart</footer>
  </main>
}
