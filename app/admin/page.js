"use client";

import { useState } from "react";

function money(amount, currency="CHF"){
  return new Intl.NumberFormat("fr-CH",{style:"currency",currency}).format(Number(amount || 0));
}

export default function Admin(){
  const [form,setForm]=useState({
    password:"", username:"", code:"", title:"", color:"", size:"", price:"", quantity:"1"
  });
  const [msg,setMsg]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [cart,setCart]=useState(null);
  const [cartLoading,setCartLoading]=useState(false);

  function change(k,v){ setForm(x=>({...x,[k]:v})); }

  async function adminCart(action, extra={}){
    if(!form.password) throw new Error("Introduisez le mot de passe administrateur.");
    if(!form.username.trim()) throw new Error("Introduisez le @TikTok.");

    const r=await fetch("/api/admin/cart",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        password:form.password,
        username:form.username,
        action,
        ...extra
      })
    });

    const data=await r.json();
    if(!r.ok) throw new Error(data.error || "Erreur lors de la modification du panier.");
    return data;
  }

  async function loadCart(showError=true){
    setCartLoading(true);
    if(showError) setError("");
    try{
      const data=await adminCart("get");
      setCart(data.cart || null);
    }catch(err){
      setCart(null);
      if(showError) setError(err.message);
    }finally{
      setCartLoading(false);
    }
  }

  async function changeQuantity(index, quantity){
    if(quantity < 1) return removeItem(index);
    setCartLoading(true); setError(""); setMsg("");
    try{
      const data=await adminCart("quantity",{index,quantity});
      setCart(data.cart || null);
      setMsg("Quantité mise à jour.");
    }catch(err){ setError(err.message); }
    finally{ setCartLoading(false); }
  }

  async function removeItem(index){
    if(!window.confirm("Retirer cet article du panier ?")) return;
    setCartLoading(true); setError(""); setMsg("");
    try{
      const data=await adminCart("remove",{index});
      setCart(data.cart || null);
      setMsg(data.cart ? "Article retiré du panier." : "Article retiré. Le panier est maintenant vide.");
    }catch(err){ setError(err.message); }
    finally{ setCartLoading(false); }
  }

  async function submit(e){
    e.preventDefault(); setLoading(true); setMsg(""); setError("");
    try{
      const r=await fetch("/api/admin/reservation",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(form)
      });
      const data=await r.json();
      if(!r.ok) throw new Error(data.error || "Erro ao guardar.");
      setMsg(`Reserva guardada para @${data.username}. Total atual: ${data.total} ${data.currency}.`);
      setForm(x=>({...x,code:"",title:"",color:"",size:"",price:"",quantity:"1"}));
      setTimeout(()=>loadCart(false),150);
    }catch(err){setError(err.message)}
    finally{setLoading(false)}
  }

  return <main className="wrap">
    <div className="brand">
      <div className="logoMark">✦</div><h1>MIMUZA</h1><small>LIVE ADMIN</small>
    </div>

    <section className="card">
      <div className="adminTop">
        <h2 style={{margin:0}}>Ajouter une réservation</h2>
        <a href="/">Voir le panier client</a>
      </div>

      <p className="subtitle">Ajoute rapidement une pièce au panier TikTok d’une cliente pendant le LIVE.</p>

      <form onSubmit={submit}>
        <label>Mot de passe administrateur</label>
        <input type="password" value={form.password} onChange={e=>change("password",e.target.value)} placeholder="••••••••" required />

        <label>@ TikTok</label>
        <input value={form.username} onChange={e=>change("username",e.target.value)} placeholder="@cliente" required />

        <div style={{display:"flex",gap:10,margin:"10px 0 18px"}}>
          <button type="button" onClick={()=>loadCart(true)} disabled={cartLoading || !form.username.trim() || !form.password} style={{flex:1}}>
            {cartLoading ? "Chargement…" : "Gérer le panier de cette cliente"}
          </button>
        </div>

        <div className="row">
          <div><label>Code article</label><input value={form.code} onChange={e=>change("code",e.target.value)} placeholder="V01" /></div>
          <div><label>Nom de l’article</label><input value={form.title} onChange={e=>change("title",e.target.value)} placeholder="Robe noire" required /></div>
        </div>

        <div className="row">
          <div><label>Couleur</label><input value={form.color} onChange={e=>change("color",e.target.value)} placeholder="Noir" /></div>
          <div><label>Taille</label><input value={form.size} onChange={e=>change("size",e.target.value)} placeholder="M" /></div>
        </div>

        <div className="row">
          <div><label>Prix (CHF)</label><input type="number" step="0.01" min="0" value={form.price} onChange={e=>change("price",e.target.value)} placeholder="39.90" required /></div>
          <div><label>Quantité</label><input type="number" min="1" max="20" value={form.quantity} onChange={e=>change("quantity",e.target.value)} required /></div>
        </div>

        <button disabled={loading}>{loading ? "Enregistrement…" : "Ajouter au panier LIVE"}</button>
      </form>

      {msg && <div className="message success">{msg}</div>}
      {error && <div className="message error">{error}</div>}

      {cart && <div style={{marginTop:24,borderTop:"1px solid #eadfca",paddingTop:20}}>
        <div className="adminTop">
          <h3 style={{margin:0}}>Panier @{cart.username}</h3>
          <strong>{money(cart.total,cart.currency)}</strong>
        </div>

        <div style={{marginTop:12}}>
          {cart.items.map((it,i)=><div key={i} style={{
            display:"grid",
            gridTemplateColumns:"1fr auto",
            gap:12,
            alignItems:"center",
            padding:"13px 0",
            borderBottom:"1px solid #eee6d8"
          }}>
            <div>
              <div style={{fontWeight:700}}>{it.title}</div>
              <div style={{fontSize:13,opacity:.72,marginTop:3}}>
                {[it.code && `Code ${it.code}`,it.size && `Taille ${it.size}`,it.color && `Couleur ${it.color}`].filter(Boolean).join(" · ")}
              </div>
              <div style={{fontSize:14,marginTop:5}}>{money(it.unitPrice,cart.currency)} × {it.quantity}</div>
            </div>

            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
              <button type="button" onClick={()=>changeQuantity(i,it.quantity-1)} disabled={cartLoading}
                style={{width:42,padding:"9px 0"}}>−</button>
              <span style={{minWidth:28,textAlign:"center",fontWeight:700}}>{it.quantity}</span>
              <button type="button" onClick={()=>changeQuantity(i,it.quantity+1)} disabled={cartLoading}
                style={{width:42,padding:"9px 0"}}>+</button>
              <button type="button" onClick={()=>removeItem(i)} disabled={cartLoading}
                style={{padding:"9px 12px",background:"#fff",color:"#9b2c2c",border:"1px solid #d9b2b2"}}>
                Retirer
              </button>
            </div>
          </div>)}
        </div>

        <div className="total" style={{marginTop:16}}>
          <span>Total</span><span>{money(cart.total,cart.currency)}</span>
        </div>
      </div>}
    </section>

    <footer>Page privée · Ne partage pas le mot de passe administrateur.</footer>
  </main>
}
