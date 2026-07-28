(function(){
 "use strict";
 const VERSION="1.23.0";
 function result(id,passed,detail,evidence=[]){return {id,passed:Boolean(passed),status:passed?"passed":"failed",detail,evidence};}
 function releaseIdentity(manifest={},worker={}){
  const expectedPlatform=manifest.platform_version||null;
  const actualPlatform=worker.platform_version||null;
  const expectedWorker=manifest.worker_version||null;
  const actualWorker=worker.worker_version||null;
  const consistent=Boolean(expectedPlatform&&expectedWorker&&expectedPlatform===actualPlatform&&expectedWorker===actualWorker);
  return {consistent,expected:{platform_version:expectedPlatform,worker_version:expectedWorker},actual:{platform_version:actualPlatform,worker_version:actualWorker}};
 }
 function runReleaseIdentityRegression(){
  const manifest={platform_version:"v-test",worker_version:"worker-test",build:"2026-01-01T00:00:00Z",generated_at:"2026-01-01T00:00:01Z"};
  const sameIdentityDifferentTimestamps={platform_version:"v-test",worker_version:"worker-test",build:"2026-01-02T00:00:00Z",generated_at:"2026-01-03T00:00:00Z"};
  const mismatch={platform_version:"v-other",worker_version:"worker-test"};
  const a=releaseIdentity(manifest,sameIdentityDifferentTimestamps);
  const b=releaseIdentity(manifest,mismatch);
  return [
   result("release.identity.ignores-timestamps",a.consistent,"Equal identity remains consistent when timestamps differ.",[a]),
   result("release.identity.detects-version-mismatch",!b.consistent,"A platform or Worker identity mismatch is rejected.",[b])
  ];
 }

 function runReleaseNavigationRegression(){
  const forbidden=["v","_platform_release"];
  const url=new URL(location.href);
  const present=forbidden.filter(key=>url.searchParams.has(key));
  return result("release.navigation.canonical-url",present.length===0,present.length?`Stale release parameters remain: ${present.join(", ")}`:"Visible URL uses the stable canonical route.",[{pathname:url.pathname,present}]);
 }
 function runVersionSourceRegression(){
  const manifest=window.CASA_PLATFORM_MANIFEST||{};
  const displayed=document.querySelector("[data-platform-doctor-version]")?.textContent?.trim().replace(/^v/i,"")||null;
  const expected=manifest.platform_doctor?.version||null;
  return result("platform-doctor.version.manifest-driven",!displayed||displayed===expected,displayed?`Displayed ${displayed}; manifest ${expected}`:"Version label not mounted on this route.",[{displayed,expected}]);
 }
 async function runSubsystemRegistryRegression(){
  try{
   await window.CasaSubsystemRegistry?.load?.();
   const report=window.CasaSubsystemRegistry?.validateManifest?.(window.CASA_PLATFORM_MANIFEST||{});
   return result("subsystem-registry.metadata.consistent",Boolean(report?.consistent),report?.consistent?"All subsystem names and versions resolve from the central registry.":"Subsystem Registry and manifest metadata differ.",report?.results||[]);
  }catch(error){return result("subsystem-registry.metadata.consistent",false,error.message);}
 }
 async function runAll(){
  const registryResult=await runSubsystemRegistryRegression();
  const inventory=document.querySelectorAll("#platformVersionsGrid [data-subsystem-id]");
  const registered=window.CasaSubsystemRegistry?.list?.()||[];
  const inventoryResult=result("subsystem-registry.inventory.visible",!document.querySelector("#platformVersionsGrid")||inventory.length===registered.length,`Visible ${inventory.length}; registered ${registered.length}`,[{visible:inventory.length,registered:registered.length}]);
  const coverage=window.CasaSubsystemRegistry?.validateCoverage?.(window.CASA_PLATFORM_MANIFEST||{});
  const coverageResult=result("subsystem-registry.manifest.coverage",Boolean(coverage?.consistent),coverage?.consistent?"Every versioned manifest subsystem is registered.":`Missing registry entries: ${(coverage?.missing||[]).join(", ")}`,[coverage]);
  const results=[...runReleaseIdentityRegression(),runReleaseNavigationRegression(),runVersionSourceRegression(),registryResult,coverageResult,inventoryResult];
  const report={schema_version:"1.0",version:VERSION,status:results.every(x=>x.passed)?"passed":"failed",results,generated_at:new Date().toISOString()};
  window.CasaAudit?.record?.("platform.contracts.completed","contracts",report);
  window.CasaEvents?.publish?.("platform:contracts-completed",report);
  return report;
 }
 window.CasaContracts={version:VERSION,releaseIdentity,runReleaseIdentityRegression,runSubsystemRegistryRegression,runAll,ready:true};
 window.CasaCore?.modules?.register?.({id:"contracts",version:VERSION,capabilities:["contracts.release-identity","contracts.regression-tests"]});
})();
