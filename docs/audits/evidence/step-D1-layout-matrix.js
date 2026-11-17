async (page) => {
 await page.setViewportSize({width:2800,height:1400})
 await page.evaluate(()=>document.fonts.ready)
 const inspector=page.getByRole('complementary').filter({has:page.getByTestId('status-badge')})
 const results=[]
 for(const width of [240,280,500])for(const font of [14,21,28])for(const theme of ['light','dark'])for(const spacing of [false,true]){
  await inspector.evaluate((aside,{width,font,theme,spacing})=>{
   aside.parentElement.style.width=`${width}px`;document.documentElement.style.fontSize=`${font}px`;document.documentElement.dataset.theme=theme
   let css=document.getElementById('d1-text-spacing');if(!css){css=document.createElement('style');css.id='d1-text-spacing';document.head.append(css)}
   css.textContent=spacing?'aside,aside *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}aside p{margin-block-end:2em!important}':''
  },{width,font,theme,spacing})
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  const value=await inspector.evaluate(aside=>{
   const nodes=[...aside.querySelectorAll('[data-testid=suggested-property-icon-slot],[data-testid=add-property-icon-slot]')].map(e=>e.nextElementSibling)
   nodes.push(...aside.querySelectorAll('[data-testid=relationship-section-label]>span'))
   const clipped=nodes.filter(e=>e&&e.scrollWidth>e.clientWidth+1).map(e=>({text:e.textContent,width:e.clientWidth,scroll:e.scrollWidth}))
   const body=aside.querySelector('.app-scrollbar')
   return {width:aside.clientWidth,overflow:body.scrollWidth-body.clientWidth,clipped,columns:getComputedStyle(aside.querySelector('[data-testid=type-selector]').parentElement).gridTemplateColumns}
  })
  results.push({width,font,theme,spacing,...value})
 }
 await inspector.evaluate(aside=>{aside.parentElement.style.width='280px';document.documentElement.style.fontSize='14px';document.getElementById('d1-text-spacing')?.remove()})
 const issues=results.filter(r=>r.overflow>2||r.clipped.length)
 if(issues.length)throw new Error(JSON.stringify({cases:results.length,issues}))
 return {cases:results.length,issues,results}
}
