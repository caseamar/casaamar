from pathlib import Path
from playwright.sync_api import sync_playwright
import re, json
root=Path(__file__).resolve().parents[1]
html=(root/'platform-lifecycle.html').read_text()
html=re.sub(r"<script[^>]+src='[^']+'[^>]*></script>","",html)
registry=json.loads((root/'registry/platform-journeys.json').read_text())
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(); errors=[]
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.set_content(html)
    page.evaluate("reg => { window.fetch = async () => ({ok:true,json:async()=>reg}); window.CasaEvents={publish:()=>{}}; }", registry)
    page.add_script_tag(content=(root/'core/casa-platform-orchestrator-v322.js').read_text())
    page.add_script_tag(content=(root/'core/casa-platform-lifecycle-ui-v322.js').read_text())
    page.wait_for_timeout(100)
    assert 'Ikke startet' in page.locator('#journey-status').inner_text()
    page.click('#implementation'); page.wait_for_timeout(50)
    assert 'Implementeringsrejsen er startet' in page.locator('#feedback').inner_text()
    assert 'Aktiv · Implementering · Demo' in page.locator('#journey-status').inner_text()
    page.click('#complete'); page.wait_for_timeout(50)
    assert 'Onboarding' in page.locator('#journey-status').inner_text()
    page.click('#improvement'); page.wait_for_timeout(50)
    assert 'Forbedringsloopet er startet' in page.locator('#feedback').inner_text()
    assert 'Aktiv · Kontinuerlig forbedring · Indsigter' in page.locator('#journey-status').inner_text()
    assert not errors, errors
    browser.close()
print('Rendered Chromium lifecycle click-path: passed')
