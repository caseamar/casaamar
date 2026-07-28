(()=>{
 const VERSION='1.0.0'; const state={rules:null,model:null,relationships:null};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const objectMap=()=>new Map((state.model?.objects||[]).map(o=>[o.id,o]));
 async function load(){
  const [rules,model]=await Promise.all([
   fetch('/registry/impact-rules.json').then(r=>{if(!r.ok)throw new Error('Impact Rules kunne ikke indlæses');return r.json()}),
   fetch('/registry/domain-model.json').then(r=>{if(!r.ok)throw new Error('Domain Model kunne ikke indlæses');return r.json()})
  ]); state.rules=rules;state.model=model;
  if(window.CasaDomainRelationships){await CasaDomainRelationships.load();state.relationships=CasaDomainRelationships}
  return snapshot();
 }
 function useModel(model){state.model=model;if(window.CasaDomainRelationships)CasaDomainRelationships.useModel(model);return snapshot()}
 function confidenceAllowed(r){return r.status==='verified'||(r.status==='derived'&&Number(r.confidence)>=Number(state.rules?.governance?.derived_relationship_min_confidence||.7))}
 function analyse(objectId,{changeType='fact_changed',description='Domænefakta er ændret'}={}){
  const objects=objectMap(),source=objects.get(objectId);if(!source)throw new Error(`Ukendt domæneobjekt: ${objectId}`);
  const graph=state.relationships?state.relationships.traverse(objectId,{maxDepth:3,statuses:['verified','derived']}):{nodes:[source],edges:[]};
  const edges=(graph.edges||[]).filter(confidenceAllowed),nodes=(graph.nodes||[]).filter(Boolean);
  const affected={assets:[],capabilities:[],experiences:[],content:[],objects:[]};
  for(const o of nodes){if(o.id===objectId)continue; if(o.type==='asset')affected.assets.push(o);else if(o.type==='capability')affected.capabilities.push(o);else if(['experience','atmosphere'].includes(o.type))affected.experiences.push(o);else if(o.type==='page')affected.content.push(o);else affected.objects.push(o)}
  const actions=[]; const add=(key,title,target,reason,priority='medium')=>{if(actions.some(a=>a.key===key))return;actions.push({key,title,target,reason,priority,status:'suggested',requiresApproval:true})};
  for(const o of affected.assets)add(`asset:${o.id}`,'Gennemgå asset og alt-tekst',o.id,`${source.name} er relateret til ${o.name}`,'high');
  for(const o of affected.capabilities)add(`cap:${o.id}`,'Opdatér grounded AI-kontekst',o.id,`${o.name} bruger relationer til ${source.name}`,'high');
  if(affected.experiences.length)add('content:experience','Gennemgå oplevelsesbeskrivelser','content-intelligence',`${affected.experiences.length} relaterede oplevelser kan være påvirket`,'medium');
  if(!actions.length)add('review:domain','Gennemgå domæneændringen','domain-intelligence','Der blev ikke fundet automatiske consumers; manuel vurdering kræves','low');
  const risk=changeType==='fact_removed'?'high':actions.length>4?'medium':'low';
  const evidence=edges.map(e=>`${e.subjectObject?.name||e.subject} ${e.type?.label||e.predicate} ${e.objectObject?.name||e.object}${e.status==='derived'?` (${Math.round(e.confidence*100)}% afledt)`:''}`);
  return {version:VERSION,status:'verified',change:{object:clone(source),type:changeType,description},risk,affected:Object.fromEntries(Object.entries(affected).map(([k,v])=>[k,clone(v)])),actions,evidence,summary:{affectedNodes:nodes.length-1,relationships:edges.length,actions:actions.length,automaticPublishing:false}};
 }
 function snapshot(){return {version:VERSION,status:state.rules&&state.model?'verified':'not_loaded',rules:state.rules?.consumer_rules?.length||0,changeTypes:state.rules?.change_types?.length||0,humanApproval:state.rules?.governance?.publication_requires_human_approval!==false}}
 window.CasaDomainImpact={VERSION,load,useModel,analyse,snapshot,get rules(){return clone(state.rules)},get model(){return clone(state.model)}};
})();
