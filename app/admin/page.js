"use client";
import { useState } from "react";

export default function Admin(){
  const [form,setForm]=useState({
    password:"", username:"", code:"", title:"", color:"", size:"", price:"", quantity:"1"
  });
  const [msg,setMsg]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  function change(k,v){ setForm(x=>({...x,[k]:v})); }

  async function submit(e){
    e.preventDefault(); setLoading(true); setMsg(""); setError("");
    try{
      const r=await fetch("/api/admin/reservation",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)
      });
      const data=await r.json();
      if(!r.ok) throw new Error(data.error || "Erro ao guardar.");
      setMsg(`Reserva guardada para @${data.username}. Total atual: ${data.total} ${data.currency}.`);
      setForm(x=>({...x,code:"",title:"",color:"",size:"",price:"",quantity:"1"}));
    }catch(err){setError(err.message)}
    finally{setLoading(false)}
  }

  return <main className="wrap">
    <div className="brand">
      <div className="logoMark">✦</div><h1>MIMUZA</h1><small>LIVE ADMIN</small>
    </div>
    <section className="card">
      <div className="adminTop"><h2 style={{margin:0}}>Ajouter une réservation</h2><a href="/">Voir le panier client</a></div>
      <p className="subtitle">Ajoute rapidement une pièce au panier TikTok d’une cliente pendant le LIVE.</p>
      <form onSubmit={submit}>
        <label>Mot de passe administrateur</label>
        <input type="password" value={form.password} onChange={e=>change("password",e.target.value)} placeholder="••••••••" required />
        <label>@ TikTok</label>
        <input value={form.username} onChange={e=>change("username",e.target.value)} placeholder="@cliente" required />
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
    </section>
    <footer>Page privée · Ne partage pas le mot de passe administrateur.</footer>
  </main>
}
