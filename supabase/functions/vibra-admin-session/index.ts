import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const url=Deno.env.get("SUPABASE_URL")??"", pub=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")??Deno.env.get("SUPABASE_ANON_KEY")??"", secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const origins=new Set((Deno.env.get("ALLOWED_ORIGINS")??"").split(",").map(x=>x.trim()).filter(Boolean));
function out(data:unknown,status:number,origin:string){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"}})}
Deno.serve(async req=>{
 const origin=req.headers.get("Origin")??"";
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origins.has(origin)?origin:"null","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}});
 if(req.method!=="POST"||!origins.has(origin)) {
  console.warn("[vibra-admin-session] request rejected", { method:req.method, originAllowed:origins.has(origin), origin:origin||null });
  return out({error:"Solicitação não autorizada."},403,"null");
 }
 if(!url||!pub||!secret) {
  console.error("[vibra-admin-session] missing required server configuration", { hasSupabaseUrl:!!url, hasPublicKey:!!pub, hasServiceRoleKey:!!secret });
  return out({error:"Serviço temporariamente indisponível."},503,origin);
 }
 const authorization=req.headers.get("Authorization")??"";
 if(!authorization.startsWith("Bearer "))return out({error:"Autenticação necessária."},401,origin);
 let user:any, claims:any, body:any;
 try{
  const u=await fetch(url+"/auth/v1/user",{headers:{apikey:pub,Authorization:authorization}});
  if(!u.ok) {
   console.warn("[vibra-admin-session] Supabase Auth rejected bearer token", { status:u.status });
   return out({error:"Autenticação necessária."},401,origin);
  }
  user=await u.json();
  const parts=authorization.slice(7).split("."); if(parts.length!==3)throw new Error();
  claims=JSON.parse(atob(parts[1].replace(/-/g,"+").replace(/_/g,"/")));
  body=await req.json();
 }catch{return out({error:"Autenticação necessária."},401,origin)}
 const sid=claims.session_id, exp=claims.exp;
 if(typeof sid!=="string"||!/^[0-9a-f-]{36}$/i.test(sid)||typeof exp!=="number"||exp*1000<=Date.now())return out({admin:false,allowed:false},200,origin);
 const h={apikey:secret,Authorization:"Bearer "+secret,"Content-Type":"application/json"};
 if(body?.action==="release"){
  const rr=await fetch(url+"/rest/v1/rpc/vibra_release_admin_session",{method:"POST",headers:h,body:JSON.stringify({p_user_id:user.id,p_session_id:sid})});
  if(!rr.ok) {
   const detail=(await rr.text().catch(()=>"")).slice(0,500);
   console.error("[vibra-admin-session] release RPC failed", { status:rr.status, detail, userId:user.id });
   return out({error:"Não foi possível encerrar a sessão."},503,origin);
  }
  return out({admin:true,allowed:false,released:true},200,origin);
 }
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(req.headers.get("User-Agent")??""));
 const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
 const rr=await fetch(url+"/rest/v1/rpc/vibra_claim_admin_session",{method:"POST",headers:h,body:JSON.stringify({p_user_id:user.id,p_session_id:sid,p_expires_at:new Date(exp*1000).toISOString(),p_user_agent_hash:hash})});
 if(!rr.ok) {
  const detail=(await rr.text().catch(()=>"")).slice(0,500);
  console.error("[vibra-admin-session] claim RPC failed", { status:rr.status, detail, userId:user.id });
  return out({error:"Não foi possível validar a sessão."},503,origin);
 }
 return out(await rr.json(),200,origin);
});
