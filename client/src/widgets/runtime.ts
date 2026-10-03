/** Self-contained: this exact function is serialized into published pages. */
export function mountWidgets(scope: ParentNode = document) {
  const cleanups: (() => void)[] = []
  scope.querySelectorAll<HTMLElement>('[data-fw]').forEach(root => {
    if (root.dataset.fwReady) return
    root.dataset.fwReady = 'true'
    cleanups.push(() => { delete root.dataset.fwReady })
    const controller = new AbortController()
    const on = (target: EventTarget, event: string, handler: (event: Event) => void) => target.addEventListener(event, handler, { signal: controller.signal })
    const all = <T extends HTMLElement = HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector))
    const one = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)
    cleanups.push(() => controller.abort())
    const family = root.dataset.fw
    const type = root.dataset.type || ''
    const p: Record<string, unknown> = (() => {try {return JSON.parse(root.dataset.props || '{}')} catch {return {}}})()
    const text = (value: unknown) => typeof value === 'string' ? value : ''
    const numeric = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
    const status = (message: string) => { const output = one('output[role="status"]'); if (output) output.textContent = message }
    const listen = (selector:string,event:string,handler:(element:HTMLElement,event:Event)=>void) => all(selector).forEach(element=>on(element,event,event=>handler(element,event)))
    const safeHref = (value:unknown) => {const url=text(value).trim();return /^(https?:\/\/|mailto:|tel:|#|\/(?!\/)|\?|\.\/)/i.test(url) ? url : '#'}
    const currency = (value:unknown,code:unknown=p.currency) => {try{return new Intl.NumberFormat('en-US',{style:'currency',currency:text(code)||'USD'}).format(numeric(value))}catch{return numeric(value).toFixed(2)}}
    const storageKey = 'sitebuilder-commerce:' + (document.documentElement.dataset.widgetSite || 'local')
    const stored = (suffix:string):Record<string,unknown>[] => {try{const value=JSON.parse(localStorage.getItem(storageKey+suffix)||'[]');return Array.isArray(value)?value.filter(item=>item&&typeof item==='object'):[]}catch{return []}}
    const save = (suffix:string,items:Record<string,unknown>[]) => {try{localStorage.setItem(storageKey+suffix,JSON.stringify(items));window.dispatchEvent(new Event('sitebuilder:cart-change'));return true}catch{status('Browser storage is unavailable. Your selection could not be saved.');return false}}
    const submit = async (endpoint:unknown,payload:Record<string,unknown>|FormData,button?:HTMLButtonElement) => {
      const url=text(endpoint).trim()
      if(!/^(https?:\/\/|\/(?!\/))/i.test(url)){status('This service is not connected yet. Please contact the website owner.');return}
      if(button)button.disabled=true
      status('Sending…')
      try{
        const response=await fetch(url,{method:'POST',headers:payload instanceof FormData?undefined:{'Content-Type':'application/json'},body:payload instanceof FormData?payload:JSON.stringify(payload),signal:controller.signal})
        const result=await response.json().catch(()=>({}))
        if(!response.ok||result.ok===false)throw new Error(typeof result.error==='string'?result.error:typeof result.message==='string'?result.message:`Request failed (${response.status})`)
        status(typeof result.message==='string'?result.message:text(p.successMessage)||'Your request was received.')
        if(typeof result.checkoutUrl==='string'&&/^https?:\/\//i.test(result.checkoutUrl))window.location.assign(result.checkoutUrl)
      }catch(error){if(!controller.signal.aborted)status(error instanceof Error?error.message:'Unable to send. Please try again.')}
      finally{if(button)button.disabled=false}
    }
    listen('[data-copy]','click',async element=>{try{await navigator.clipboard.writeText(element.dataset.copy||'');status('Copied.')}catch{status('Copy failed. Select and copy the text manually.')}})
    listen('[data-dismiss]','click',element=>{const notice=element.closest<HTMLElement>('[data-notice], [role="alert"], [role="status"]');if(notice)notice.hidden=true})
    listen('details','keydown',(element,event)=>{if((event as KeyboardEvent).key==='Escape'){(element as HTMLDetailsElement).open=false;element.querySelector<HTMLElement>('summary')?.focus()}})
    listen('[data-share]','click',(element,event)=>{
      event.preventDefault();const url=encodeURIComponent(element.dataset.shareUrl||window.location.href),message=encodeURIComponent(element.dataset.shareText||document.title)
      const links:Record<string,string>={Facebook:`https://www.facebook.com/sharer/sharer.php?u=${url}`,LinkedIn:`https://www.linkedin.com/sharing/share-offsite/?url=${url}`,X:`https://twitter.com/intent/tweet?url=${url}&text=${message}`,Email:`mailto:?subject=${message}&body=${url}`}
      const destination=links[element.dataset.share||''];if(destination)window.open(destination,'_blank','noopener,noreferrer')
    })
    if(family==='input')listen('input[type="range"]','input',element=>{const output=one('output');if(output)output.textContent=(element as HTMLInputElement).value})
    if(type==='notification')listen('[data-notify]','click',()=>{const notice=one('[data-notice]');if(notice){notice.hidden=false;const timer=window.setTimeout(()=>{notice.hidden=true},Math.max(1,numeric(p.duration,5))*1000);cleanups.push(()=>clearTimeout(timer))}})
    if(type==='cookie-consent'){
      const key='sitebuilder-consent:'+text(p.storageKey),panel=one('[data-consent]')
      try{if(panel&&localStorage.getItem(key))panel.hidden=true}catch{/* Choice can still be made for this visit. */}
      listen('[data-choice]','click',element=>{try{localStorage.setItem(key,element.dataset.choice||'declined');if(panel)panel.hidden=true;window.dispatchEvent(new CustomEvent('sitebuilder:consent',{detail:element.dataset.choice}))}catch{status('Your choice could not be saved in this browser.')}})
    }
    if(type==='reveal'){
      const element=one('[data-reveal]')
      if(element&&typeof IntersectionObserver!=='undefined'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){element.style.opacity='0';element.style.transform='translateY(16px)';const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){element.style.opacity='1';element.style.transform='none';observer.disconnect()}});observer.observe(element);cleanups.push(()=>observer.disconnect())}
    }
    if(family==='panels'){
      const panels=all('[data-panel]'),tabs=all<HTMLButtonElement>('[data-tab]');let index=0
      const show=(next:number)=>{index=(next+panels.length)%Math.max(panels.length,1);panels.forEach((panel,i)=>{panel.hidden=i!==index});tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1});const output=one('output');if(output)output.textContent=`Step ${index+1} of ${panels.length}`;const prev=one<HTMLButtonElement>('[data-panel-prev]'),nextButton=one<HTMLButtonElement>('[data-panel-next]');if(type==='stepper'){if(prev)prev.disabled=index===0;if(nextButton)nextButton.disabled=index===panels.length-1}}
      tabs.forEach((tab,i)=>{on(tab,'click',()=>show(i));on(tab,'keydown',event=>{const key=(event as KeyboardEvent).key;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(key))return;event.preventDefault();const next=key==='Home'?0:key==='End'?tabs.length-1:(i+(['ArrowRight','ArrowDown'].includes(key)?1:-1)+tabs.length)%tabs.length;show(next);tabs[next]?.focus()})})
      listen('[data-panel-next]','click',()=>show(index+1));listen('[data-panel-prev]','click',()=>show(index-1));show(0)
    }
    if(family==='timer'){
      let running=false,elapsed=0,last=performance.now()
      const initial=Math.max(0,numeric(p.seconds,300)),output=one('[data-timer]'),button=one('[data-start]')
      const tick=()=>{const now=performance.now();if(running)elapsed+=(now-last)/1000;last=now;const seconds=Math.floor(type==='stopwatch'?elapsed:Math.max(0,initial-elapsed));if(output)output.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;if(type==='timer'&&elapsed>=initial){running=false;if(button)button.textContent='Start'}}
      listen('[data-start]','click',()=>{if(type==='timer'&&elapsed>=initial)elapsed=0;running=!running;last=performance.now();if(button)button.textContent=running?'Pause':'Start'})
      listen('[data-reset]','click',()=>{elapsed=0;running=false;if(button)button.textContent='Start';tick()})
      const timer=window.setInterval(tick,100);cleanups.push(()=>clearInterval(timer));tick()
    }
    if(type==='animated-counter'){
      const output=one('[data-counter]'),target=numeric(p.value),duration=Math.max(0.1,numeric(p.duration,2))*1000,start=performance.now();let frame=0
      const tick=(now:number)=>{const fraction=window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(now-start)/duration);if(output)output.textContent=`${text(p.prefix)}${Math.round(target*fraction).toLocaleString('en-US')}${text(p.suffix)}`;if(fraction<1)frame=requestAnimationFrame(tick)}
      frame=requestAnimationFrame(tick);cleanups.push(()=>cancelAnimationFrame(frame))
    }
    if(type==='pricing-toggle')listen('[data-billing]','change',element=>{const annual=(element as HTMLSelectElement).value==='annual',output=one('[data-price]');if(output)output.textContent=`${currency(annual?p.annual:p.monthly)} / ${annual?'year':'month'}`})
    const selectContent = (selector:unknown) => {try{return document.querySelector(text(selector)||'main')||document.body}catch{return document.body}}
    if(type==='reading-time'){const content=selectContent(p.selector),count=(content.textContent||'').trim().split(/\s+/).filter(Boolean).length,output=one('[data-reading]');if(output)output.textContent=`${Math.max(1,Math.ceil(count/Math.max(1,numeric(p.wordsPerMinute,200))))} min read`}
    if(type==='scroll-progress'){
      let scroll:HTMLElement|null=root.parentElement;while(scroll&&scroll!==document.body&&!/(auto|scroll)/.test(getComputedStyle(scroll).overflowY))scroll=scroll.parentElement
      const scroller=scroll&&scroll!==document.body?scroll:document.documentElement,target=scroller===document.documentElement?window:scroller
      const tick=()=>{const progress=one<HTMLProgressElement>('progress');if(progress)progress.value=scroller.scrollHeight<=scroller.clientHeight?100:scroller.scrollTop/(scroller.scrollHeight-scroller.clientHeight)*100}
      on(target,'scroll',tick);on(window,'resize',tick);tick()
    }
    if(family==='navigation'){
      listen('[data-language]','change',element=>{const destination=safeHref((element as HTMLSelectElement).value);if(destination!=='#')window.location.assign(destination)})
      if(type==='table-of-contents'){
        const content=selectContent(p.selector),list=one('[data-toc]');let headings:NodeListOf<HTMLElement>|HTMLElement[]=[]
        try{headings=content.querySelectorAll(text(p.levels)||'h2,h3')}catch{headings=content.querySelectorAll('h2,h3')}
        let count=0;headings.forEach((heading,i)=>{if(root.contains(heading)||!/^H[1-6]$/.test(heading.tagName))return;if(!heading.id)heading.id=`toc-${root.dataset.widgetId}-${i}`;const li=document.createElement('li'),a=document.createElement('a');a.href='#'+encodeURIComponent(heading.id);a.textContent=heading.textContent;li.append(a);list?.append(li);count++});const empty=one('[data-toc-empty]');if(empty)empty.hidden=count>0
        cleanups.push(()=>list?.replaceChildren())
      }
      if(type==='scroll-spy-nav'){
        const links=all<HTMLAnchorElement>('a[href^="#"]')
        const targets=links.map(link=>{try{return document.querySelector(decodeURIComponent(link.getAttribute('href')||''))}catch{return null}}).filter((element):element is Element=>Boolean(element))
        if(targets.length&&typeof IntersectionObserver!=='undefined'){
          const mark=(activeIndex:number)=>links.forEach((link,i)=>link.setAttribute('aria-current',i===activeIndex?'true':'false'))
          const observer=new IntersectionObserver(entriesList=>{
            const visible=entriesList.filter(entry=>entry.isIntersecting)
            if(visible.length){const index=targets.indexOf(visible[0].target);if(index>=0)mark(index)}
          },{rootMargin:'-40% 0px -40% 0px'})
          targets.forEach(target=>observer.observe(target));cleanups.push(()=>observer.disconnect())
        }
      }
    }
    if(family==='media'){
      listen('[data-compare]','input',element=>{const after=one('[data-after]');if(after)after.style.clipPath=`inset(0 ${100-numeric((element as HTMLInputElement).value,50)}% 0 0)`})
      listen('[data-zoom]','input',element=>{const image=one('[data-zoom-image]');if(image)image.style.transform=`scale(${numeric((element as HTMLInputElement).value,1)})`})
      listen('[data-track]','change',element=>{const audio=one<HTMLAudioElement>('audio');if(audio){audio.src=(element as HTMLSelectElement).value;audio.load()}})
      listen('[data-video-track]','change',element=>{const video=one<HTMLVideoElement>('video');if(video){video.src=(element as HTMLSelectElement).value;video.load()}})
    }
    if(family==='collection'){
      if(type==='read-more')listen('[data-more-text]','click',element=>{const full=one('[data-full]'),excerpt=one('[data-excerpt]');if(full&&excerpt){full.hidden=!full.hidden;excerpt.hidden=!full.hidden;element.textContent=full.hidden?text(p.label)||'Read more':'Show less';element.setAttribute('aria-expanded',String(!full.hidden))}})
      if(type==='load-more'){let visible=Math.max(1,numeric(p.batch,1));listen('[data-load-more]','click',element=>{const items=all('[data-item]');visible+=Math.max(1,numeric(p.batch,1));items.forEach((item,i)=>{item.hidden=i>=visible});element.hidden=visible>=items.length})}
      if(['search-widget','search-results'].includes(type)){
        const input=one<HTMLInputElement>('[data-filter]'),items=all('[data-item]')
        const filter=()=>{const query=input?.value.toLowerCase()||'';let found=0;items.forEach(item=>{item.hidden=!(item.textContent||'').toLowerCase().includes(query);if(!item.hidden)found++});status(`${found} results`)}
        if(input){if(type==='search-results')input.value=new URLSearchParams(location.search).get(text(p.parameter)||'q')||'';on(input,'input',filter)}filter()
      }
      if(type==='gallery-filter'){
        const buttons=all<HTMLButtonElement>('[data-category-filter]'),cards=all('[data-item]')
        listen('[data-category-filter]','click',element=>{
          const category=element.dataset.categoryFilter||''
          buttons.forEach(button=>button.setAttribute('aria-pressed',String(button===element)))
          cards.forEach(card=>{card.hidden=Boolean(category)&&card.dataset.category!==category})
        })
      }
      if(type==='lightbox-gallery'){
        const dialog=one<HTMLDialogElement>('dialog');let trigger:HTMLElement|null=null
        listen('[data-lightbox]','click',element=>{const img=element.querySelector('img'),output=one<HTMLImageElement>('[data-lightbox-image]'),caption=one('[data-lightbox-caption]');if(!dialog||!img||!output)return;trigger=element;output.src=img.src;output.alt=img.alt;if(caption)caption.textContent=img.alt;dialog.showModal()})
        listen('[data-close]','click',()=>dialog?.close());if(dialog){on(dialog,'close',()=>trigger?.focus());on(dialog,'click',event=>{if(event.target===dialog)dialog.close()})}
      }
    }
    if(type==='data-table'){
      const body=one<HTMLTableSectionElement>('tbody'),items=all<HTMLTableRowElement>('tbody tr'),input=one<HTMLInputElement>('[data-filter]');let page=0,ascending=true
      const update=()=>{const query=input?.value.toLowerCase()||'',matches=items.filter(item=>(item.textContent||'').toLowerCase().includes(query)),size=Math.max(1,numeric(p.pageSize,5)),pages=Math.max(1,Math.ceil(matches.length/size));page=Math.max(0,Math.min(page,pages-1));items.forEach(item=>{item.hidden=true});matches.slice(page*size,(page+1)*size).forEach(item=>{item.hidden=false});const output=one('output');if(output)output.textContent=`Page ${page+1} of ${pages} · ${matches.length} rows`;const prev=one<HTMLButtonElement>('[data-table-prev]'),next=one<HTMLButtonElement>('[data-table-next]');if(prev)prev.disabled=page===0;if(next)next.disabled=page===pages-1}
      if(input)on(input,'input',()=>{page=0;update()});listen('[data-table-prev]','click',()=>{page--;update()});listen('[data-table-next]','click',()=>{page++;update()})
      listen('[data-sort]','click',element=>{const index=numeric(element.dataset.sort);items.sort((a,b)=>(a.cells[index]?.textContent||'').localeCompare(b.cells[index]?.textContent||'',undefined,{numeric:true})*(ascending?1:-1));all('th').forEach(th=>th.removeAttribute('aria-sort'));element.closest('th')?.setAttribute('aria-sort',ascending?'ascending':'descending');ascending=!ascending;items.forEach(item=>body?.append(item));update()});update()
    }
    if(family==='data'){
      if(type==='progress-tracker')listen('[data-check-item]','change',()=>{const count=all<HTMLInputElement>('[data-check-item]').filter(input=>input.checked).length,progress=one<HTMLProgressElement>('progress'),output=one('output');if(progress)progress.value=count;if(output)output.textContent=`${count} completed`})
      if(['calculator','percentage-calculator','unit-converter','currency-converter','percentage-change-calculator'].includes(type)){
        const compute=()=>{const a=numeric(one<HTMLInputElement>('[data-first]')?.value),b=numeric(one<HTMLInputElement>('[data-second]')?.value);let result:number|string=0
          if(type==='percentage-calculator')result=a*b/100
          else if(type==='percentage-change-calculator')result=a===0?'Starting value cannot be zero':(b-a)/Math.abs(a)*100
          else if(type==='unit-converter'){const factors:Record<string,number>={m:1,km:1000,mi:1609.344,ft:0.3048},from=one<HTMLSelectElement>('[data-unit="0"]')?.value||'m',to=one<HTMLSelectElement>('[data-unit="1"]')?.value||'km';result=a*factors[from]/factors[to]}
          else if(type==='currency-converter'){const rates:Record<string,number>={USD:1,EUR:0.92,GBP:0.79,INR:83,AUD:1.52,CAD:1.36},from=one<HTMLSelectElement>('[data-currency="0"]')?.value||'USD',to=one<HTMLSelectElement>('[data-currency="1"]')?.value||'EUR';result=a*(rates[to]??1)/(rates[from]??1)}
          else{const operation=one<HTMLSelectElement>('[data-operation]')?.value;result=operation==='+'?a+b:operation==='-'?a-b:operation==='*'?a*b:b===0?'Cannot divide by zero':a/b}
          const output=one('output');if(output)output.textContent=typeof result==='number'?String(Number(result.toFixed(6))):result}
        all('input,select').forEach(input=>{on(input,'input',compute);on(input,'change',compute)});compute()
      }
      if(type==='age-calculator'){
        const input=one<HTMLInputElement>('[data-birthdate]'),output=one('output')
        const compute=()=>{if(!input?.value||!output)return;const birth=new Date(input.value+'T00:00:00');if(Number.isNaN(birth.getTime())){output.textContent='Enter a valid date.';return}
          const now=new Date();let years=now.getFullYear()-birth.getFullYear(),months=now.getMonth()-birth.getMonth(),days=now.getDate()-birth.getDate()
          if(days<0){months--;days+=new Date(now.getFullYear(),now.getMonth(),0).getDate()}
          if(months<0){years--;months+=12}
          output.textContent=`${years} years, ${months} months, ${days} days`}
        if(input){on(input,'input',compute);compute()}
      }
      if(type==='bmi-calculator'){
        const heightInput=one<HTMLInputElement>('[data-height]'),weightInput=one<HTMLInputElement>('[data-weight]'),output=one('output')
        const compute=()=>{const h=numeric(heightInput?.value)/100,w=numeric(weightInput?.value);if(!h||!w||!output)return
          const bmi=w/(h*h),category=bmi<18.5?'Underweight':bmi<25?'Healthy range':bmi<30?'Overweight':'Higher range'
          output.textContent=`BMI ${bmi.toFixed(1)} — ${category}`}
        ;[heightInput,weightInput].forEach(element=>element&&on(element,'input',compute));compute()
      }
      if(type==='tip-calculator'){
        const billInput=one<HTMLInputElement>('[data-bill]'),tipInput=one<HTMLInputElement>('[data-tip]'),peopleInput=one<HTMLInputElement>('[data-people]'),output=one('output')
        const compute=()=>{const bill=numeric(billInput?.value),tip=numeric(tipInput?.value),people=Math.max(1,numeric(peopleInput?.value,1));if(!output)return
          const tipAmount=bill*tip/100,total=bill+tipAmount
          output.textContent=`Tip ${currency(tipAmount)} · Total ${currency(total)} · ${currency(total/people)} per person`}
        ;[billInput,tipInput,peopleInput].forEach(element=>element&&on(element,'input',compute));compute()
      }
      if(type==='loan-calculator'){
        const principalInput=one<HTMLInputElement>('[data-principal]'),rateInput=one<HTMLInputElement>('[data-rate]'),yearsInput=one<HTMLInputElement>('[data-years]'),output=one('output')
        const compute=()=>{const principal=numeric(principalInput?.value),annual=numeric(rateInput?.value),months=Math.max(1,numeric(yearsInput?.value,20))*12;if(!output)return
          const monthlyRate=annual/100/12,payment=monthlyRate?principal*monthlyRate/(1-Math.pow(1+monthlyRate,-months)):principal/months
          output.textContent=Number.isFinite(payment)?`Estimated payment: ${currency(payment)} / month`:'Enter valid numbers.'}
        ;[principalInput,rateInput,yearsInput].forEach(element=>element&&on(element,'input',compute));compute()
      }
      if(type==='bmr-calculator'){
        const ageInput=one<HTMLInputElement>('[data-age]'),heightInput=one<HTMLInputElement>('[data-height]'),weightInput=one<HTMLInputElement>('[data-weight]'),sexInput=one<HTMLSelectElement>('[data-sex]'),output=one('output')
        const compute=()=>{const age=numeric(ageInput?.value),height=numeric(heightInput?.value),weight=numeric(weightInput?.value),sex=sexInput?.value||'female';if(!age||!height||!weight||!output)return
          const bmr=sex==='male'?10*weight+6.25*height-5*age+5:10*weight+6.25*height-5*age-161
          output.textContent=`≈ ${Math.round(bmr)} calories per day at rest`}
        ;[ageInput,heightInput,weightInput].forEach(element=>element&&on(element,'input',compute));if(sexInput)on(sexInput,'change',compute);compute()
      }
      if(type==='interest-calculator'){
        const principalInput=one<HTMLInputElement>('[data-principal]'),rateInput=one<HTMLInputElement>('[data-rate]'),yearsInput=one<HTMLInputElement>('[data-years]'),compoundInput=one<HTMLInputElement>('[data-compound]'),output=one('output')
        const compute=()=>{const principal=numeric(principalInput?.value),rate=numeric(rateInput?.value)/100,years=numeric(yearsInput?.value,5);if(!output)return
          const value=compoundInput?.checked?principal*Math.pow(1+rate,years):principal*(1+rate*years)
          output.textContent=`≈ ${currency(value)} after ${years} years`}
        ;[principalInput,rateInput,yearsInput].forEach(element=>element&&on(element,'input',compute));if(compoundInput)on(compoundInput,'change',compute);compute()
      }
      if(type==='date-calculator'){
        const fromInput=one<HTMLInputElement>('[data-date-from]'),toInput=one<HTMLInputElement>('[data-date-to]'),output=one('output')
        const compute=()=>{if(!fromInput?.value||!toInput?.value||!output)return
          const start=new Date(fromInput.value+'T00:00:00'),end=new Date(toInput.value+'T00:00:00')
          if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())){output.textContent='Enter two valid dates.';return}
          const days=Math.round(Math.abs(end.getTime()-start.getTime())/86400000)
          output.textContent=`${days} days (${Math.floor(days/7)} weeks)`}
        ;[fromInput,toInput].forEach(element=>element&&on(element,'input',compute))
      }
      if(type==='random-number-generator'){
        const minInput=one<HTMLInputElement>('[data-rand-min]'),maxInput=one<HTMLInputElement>('[data-rand-max]'),output=one('output')
        listen('[data-randomize]','click',()=>{
          const lo=Math.min(numeric(minInput?.value,1),numeric(maxInput?.value,100)),hi=Math.max(numeric(minInput?.value,1),numeric(maxInput?.value,100))
          if(output)output.textContent=String(Math.floor(Math.random()*(hi-lo+1))+lo)
        })
      }
      if(type==='text-case-converter'){
        const input=one<HTMLTextAreaElement>('[data-case-input]'),output=one<HTMLTextAreaElement>('[data-case-output]')
        listen('[data-case]','click',element=>{const value=input?.value||'',mode=element.dataset.case;if(!output)return
          output.value=mode==='upper'?value.toUpperCase():mode==='lower'?value.toLowerCase():value.replace(/\w\S*/g,word=>word[0].toUpperCase()+word.slice(1).toLowerCase())})
      }
      if(type==='simple-quiz'){
        const quiz=one('[data-quiz]'),output=quiz?.querySelector('output')
        listen('[data-quiz-check]','click',()=>{
          const selected=quiz?.querySelector<HTMLInputElement>('input[name="quiz-answer"]:checked')
          if(!selected){if(output)output.textContent='Choose an answer first.';return}
          const correct=Number(selected.value)===numeric(p.correctIndex,0)
          if(output)output.textContent=correct?'Correct!':'Not quite — try again.'
        })
      }
      if(type==='color-picker-tool'){
        const swatch=one('[data-swatch]'),output=one('output')
        listen('[data-color-input]','input',element=>{const value=(element as HTMLInputElement).value;if(swatch)swatch.style.background=value;if(output)output.textContent=value})
      }
      if(type==='roman-numeral-converter'){
        const input=one<HTMLInputElement>('[data-roman-number]'),output=one('output')
        const toRoman=(num:number)=>{const table:[number,string][]=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]
          let result='',remaining=Math.round(num);for(const [value,symbol] of table){while(remaining>=value){result+=symbol;remaining-=value}}return result}
        const compute=()=>{const value=Math.round(numeric(input?.value,1994));if(output)output.textContent=value>=1&&value<=3999?toRoman(value):'Enter a number from 1 to 3999.'}
        if(input){on(input,'input',compute);compute()}
      }
      if(type==='random-color-generator'){
        const swatch=one('[data-swatch]'),output=one('[data-copy]')
        const randomize=()=>{const hex='#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0');if(swatch)swatch.style.background=hex;if(output){output.textContent=hex;output.dataset.copy=hex}}
        listen('[data-randomize-color]','click',randomize);randomize()
      }
      if(type==='password-generator'){
        const lengthInput=one<HTMLInputElement>('[data-length]'),output=one('[data-password]')
        const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
        const generate=()=>{
          const len=Math.max(6,Math.min(64,numeric(lengthInput?.value,16))),random=new Uint32Array(len)
          if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(random)
          else for(let i=0;i<len;i++)random[i]=Math.floor(Math.random()*0xffffffff)
          let value='';for(let i=0;i<len;i++)value+=chars[random[i]%chars.length]
          if(output){output.textContent=value;output.dataset.copy=value}
        }
        listen('[data-generate-password]','click',generate);generate()
        listen('[data-copy-password]','click',async()=>{try{await navigator.clipboard.writeText(output?.textContent||'');status('Copied.')}catch{status('Copy failed. Select and copy manually.')}})
      }
      if(type==='print-button')listen('[data-print]','click',()=>window.print())
      if(type==='share-page-button')listen('[data-share-page]','click',async()=>{
        const nav=navigator as Navigator & {share?:(data:{title?:string;url?:string})=>Promise<void>}
        if(nav.share){try{await nav.share({title:document.title,url:location.href})}catch{/* Visitor cancelled the share sheet. */}}
        else{try{await navigator.clipboard.writeText(location.href);status('Link copied to clipboard.')}catch{status('Could not copy the link.')}}
      })
      if(type==='signature-pad'){
        const canvas=one<HTMLCanvasElement>('[data-signature-canvas]')
        if(canvas){
          const resize=()=>{const rect=canvas.getBoundingClientRect();canvas.width=rect.width;canvas.height=rect.height}
          resize();on(window,'resize',resize)
          const ctx=canvas.getContext('2d');let drawing=false
          const point=(event:PointerEvent)=>{const rect=canvas.getBoundingClientRect();return {x:event.clientX-rect.left,y:event.clientY-rect.top}}
          on(canvas,'pointerdown',event=>{drawing=true;const {x,y}=point(event as PointerEvent);ctx?.beginPath();ctx?.moveTo(x,y);canvas.setPointerCapture((event as PointerEvent).pointerId)})
          on(canvas,'pointermove',event=>{if(!drawing||!ctx)return;const {x,y}=point(event as PointerEvent);ctx.lineTo(x,y);ctx.stroke()})
          on(canvas,'pointerup',()=>{drawing=false});on(canvas,'pointerleave',()=>{drawing=false})
          listen('[data-signature-clear]','click',()=>{ctx?.clearRect(0,0,canvas.width,canvas.height);status('Cleared.')})
        }
      }
      if(type==='otp-input'){
        const boxes=all<HTMLInputElement>('[data-otp-digit]')
        boxes.forEach((box,i)=>{
          on(box,'input',()=>{box.value=box.value.replace(/[^0-9a-zA-Z]/g,'').slice(0,1);if(box.value&&boxes[i+1])boxes[i+1].focus()})
          on(box,'keydown',event=>{if((event as KeyboardEvent).key==='Backspace'&&!box.value&&boxes[i-1])boxes[i-1].focus()})
        })
      }
      if(type==='dual-range-slider'){
        const minInput=one<HTMLInputElement>('[data-range-min]'),maxInput=one<HTMLInputElement>('[data-range-max]'),output=one('output')
        const update=()=>{let lo=numeric(minInput?.value),hi=numeric(maxInput?.value)
          if(lo>hi){if(document.activeElement===minInput){hi=lo;if(maxInput)maxInput.value=String(hi)}else{lo=hi;if(minInput)minInput.value=String(lo)}}
          if(output)output.textContent=`${lo} – ${hi}`}
        ;[minInput,maxInput].forEach(element=>element&&on(element,'input',update));update()
      }
      if(type==='like-button'){
        const key='sitebuilder-like:'+root.dataset.widgetId,button=one<HTMLButtonElement>('[data-like]'),output=one('output')
        let liked=false;try{liked=Boolean(localStorage.getItem(key))}catch{/* Not persisted, still usable this visit. */}
        const paint=()=>{if(button)button.setAttribute('aria-pressed',String(liked));if(output)output.textContent=liked?'You liked this.':''}
        paint()
        listen('[data-like]','click',()=>{liked=!liked;try{if(liked)localStorage.setItem(key,'1');else localStorage.removeItem(key)}catch{/* Not persisted, still usable this visit. */}paint()})
      }
      if(type==='emoji-reactions')listen('[data-reaction]','click',element=>{void submit(p.endpoint,{reaction:element.dataset.reaction||''},element as HTMLButtonElement)})
      if(type==='was-this-helpful')listen('[data-helpful]','click',element=>{void submit(p.endpoint,{helpful:element.dataset.helpful||''},element as HTMLButtonElement)})
      if(type==='live-clock'){
        const output=one('time[data-live-clock]')
        const tick=()=>{if(!output)return;const now=new Date();output.textContent=now.toLocaleString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});output.setAttribute('datetime',now.toISOString())}
        tick();const timer=window.setInterval(tick,1000);cleanups.push(()=>clearInterval(timer))
      }
      if(type==='typewriter-text'){
        const output=one('[data-typewriter]'),full=output?.getAttribute('data-typewriter')||'',speed=Math.max(5,numeric(output?.getAttribute('data-speed'),40))
        if(output&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
          let index=0
          const typeNext=()=>{output.textContent=full.slice(0,index);index++;if(index<=full.length)timer=window.setTimeout(typeNext,speed)}
          let timer=window.setTimeout(typeNext,speed);cleanups.push(()=>clearTimeout(timer))
        }else if(output)output.textContent=full
      }
      if(type==='random-quote'){
        const list=Array.isArray(p.items)?p.items:[],quoteOutput=one('[data-quote]'),authorOutput=one('[data-author]')
        listen('[data-next-quote]','click',()=>{
          if(!list.length)return
          const pick=list[Math.floor(Math.random()*list.length)] as Record<string,unknown>
          if(quoteOutput)quoteOutput.textContent=text(pick.quote);if(authorOutput)authorOutput.textContent='— '+text(pick.author)
        })
      }
      if(type==='poll-widget'){
        const form=one<HTMLFormElement>('[data-poll]')
        if(form)on(form,'submit',event=>{
          event.preventDefault()
          const selected=new FormData(form).get('poll-option')
          if(!selected){status('Choose an option first.');return}
          void submit(p.endpoint,{option:String(selected)},form.querySelector<HTMLButtonElement>('button[type="submit"]')||undefined)
        })
      }
      if(type==='sortable-list'){
        const list=one('[data-sortable]')
        listen('[data-move]','click',element=>{
          const item=element.closest('li');if(!item||!list)return
          const direction=numeric(element.dataset.move),sibling=direction<0?item.previousElementSibling:item.nextElementSibling
          if(sibling){if(direction<0)list.insertBefore(item,sibling);else list.insertBefore(sibling,item);status('Order updated.');element.focus()}
        })
      }
      if(type==='calendar'){
        let date=new Date(text(p.startDate)+'T12:00:00');if(Number.isNaN(date.getTime()))date=new Date();let selected=''
        const grid=one('[data-calendar]'),label=one('[data-month-label]')
        const draw=()=>{if(!grid)return;grid.replaceChildren();if(label)label.textContent=date.toLocaleDateString('en-US',{month:'long',year:'numeric'});['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(day=>{const span=document.createElement('span');span.textContent=day;grid.append(span)});const first=new Date(date.getFullYear(),date.getMonth(),1).getDay(),days=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();for(let i=0;i<first;i++)grid.append(document.createElement('span'));for(let day=1;day<=days;day++){const button=document.createElement('button');button.type='button';const iso=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;button.textContent=String(day);button.dataset.date=iso;button.setAttribute('aria-label',iso);button.setAttribute('aria-pressed',String(selected===iso));grid.append(button)}}
        if(grid){on(grid,'click',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-date]');if(button){selected=button.dataset.date||'';const output=one('output');if(output)output.textContent=selected;draw();grid.querySelector<HTMLButtonElement>(`[data-date="${selected}"]`)?.focus()}});on(grid,'keydown',event=>{const key=(event as KeyboardEvent).key,buttons=Array.from(grid.querySelectorAll<HTMLButtonElement>('button')),index=buttons.indexOf(event.target as HTMLButtonElement);if(index<0||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(key))return;event.preventDefault();const next=key==='Home'?0:key==='End'?buttons.length-1:index+(key==='ArrowLeft'?-1:key==='ArrowRight'?1:key==='ArrowUp'?-7:7);buttons[Math.max(0,Math.min(buttons.length-1,next))]?.focus()})}
        listen('[data-month-step]','click',element=>{date=new Date(date.getFullYear(),date.getMonth()+numeric(element.dataset.monthStep),1);draw()});draw()
      }
    }
    const renderCart=()=>{
      const container=one('[data-cart-items]');if(!container)return
      const items=stored(':cart').filter(item=>type!=='cart-item'||item.productId===p.productId);container.replaceChildren()
      items.forEach(item=>{const row=document.createElement('div'),name=document.createElement('span'),remove=document.createElement('button');row.className='fw-actions';name.textContent=`${text(item.title)} × ${numeric(item.quantity,1)} — ${currency(numeric(item.price)*numeric(item.quantity,1),item.currency||p.currency)}`;remove.type='button';remove.textContent='Remove';remove.dataset.removeProduct=text(item.productId);remove.setAttribute('aria-label',`Remove ${text(item.title)}`);row.append(name,remove);container.append(row)})
      const total=one('[data-cart-total]');if(total)total.textContent=items.length?`Subtotal: ${currency(items.reduce((sum,item)=>sum+numeric(item.price)*numeric(item.quantity,1),0))} (shipping and tax calculated at checkout)`:'Cart is empty'
    }
    const addProduct=(product:Record<string,unknown>)=>{const cart=stored(':cart'),quantity=Math.max(1,numeric(p.quantity,1)),existing=cart.find(item=>item.productId===product.productId);if(existing)existing.quantity=Math.max(1,numeric(existing.quantity,1)+quantity);else cart.push({...product,quantity});if(save(':cart',cart))status(`${text(product.title)} added to cart.`)}
    if(family==='commerce'){
      listen('[data-quantity-step]','click',element=>{const input=one<HTMLInputElement>('input');if(input){input.value=String(Math.max(numeric(input.min,1),Math.min(numeric(input.max,20),numeric(input.value,1)+numeric(element.dataset.quantityStep))))}})
      listen('[data-commerce-action]','click',async element=>{let product:Record<string,unknown>;try{product=JSON.parse(element.dataset.product||'{}')}catch{return}
        const action=element.dataset.commerceAction
        if(action==='add')addProduct(product)
        else if(action==='buy')await submit(p.endpoint,{items:[{...product,quantity:Math.max(1,numeric(p.quantity,1))}]},element as HTMLButtonElement)
        else{const suffix=action==='wishlist'?':wishlist':':compare',items=stored(suffix),exists=items.some(item=>item.productId===product.productId);if(save(suffix,exists?items.filter(item=>item.productId!==product.productId):[...items,product])){element.setAttribute('aria-pressed',String(!exists));status(exists?'Removed from your selection.':'Saved to your selection.')}}
      })
      listen('[data-add-variation]','click',()=>{const items=Array.isArray(p.items)?p.items:[],index=numeric(one<HTMLSelectElement>('[data-variation]')?.value);if(items[index])addProduct({...items[index],currency:p.currency})})
      on(root,'click',event=>{
        const removeCart=(event.target as Element).closest<HTMLElement>('[data-remove-product]');if(removeCart)save(':cart',stored(':cart').filter(item=>item.productId!==removeCart.dataset.removeProduct))
        const removeWishlist=(event.target as Element).closest<HTMLElement>('[data-remove-wishlist]');if(removeWishlist)save(':wishlist',stored(':wishlist').filter(item=>item.productId!==removeWishlist.dataset.removeWishlist))
      })
      listen('[data-checkout]','click',element=>{const items=stored(':cart');if(!items.length){status('Your cart is empty.');return}void submit(p.endpoint,{items},element as HTMLButtonElement)})
      const renderFreeShipping=()=>{
        const container=one('[data-shipping-progress]');if(!container)return
        const items=stored(':cart'),subtotal=items.reduce((sum,item)=>sum+numeric(item.price)*numeric(item.quantity,1),0),threshold=Math.max(1,numeric(p.threshold,75))
        const bar=container.querySelector('progress'),message=container.querySelector('[data-shipping-message]')
        if(bar)bar.value=Math.min(threshold,subtotal)
        if(message)message.textContent=subtotal>=threshold?'You have free shipping!':`Add ${currency(threshold-subtotal)} more for free shipping.`
      }
      const renderWishlistSummary=()=>{
        const container=one('[data-wishlist-items]');if(!container)return
        const items=stored(':wishlist');container.replaceChildren()
        items.forEach(item=>{const row=document.createElement('div'),name=document.createElement('span'),remove=document.createElement('button');row.className='fw-actions';name.textContent=`${text(item.title)} — ${currency(numeric(item.price),item.currency||p.currency)}`;remove.type='button';remove.textContent='Remove';remove.dataset.removeWishlist=text(item.productId);remove.setAttribute('aria-label',`Remove ${text(item.title)}`);row.append(name,remove);container.append(row)})
        const empty=one('[data-wishlist-empty]');if(empty)empty.hidden=items.length>0
      }
      const refresh=()=>{renderCart();renderFreeShipping();renderWishlistSummary();all('[data-commerce-action]').forEach(button=>{const action=button.dataset.commerceAction;if(action!=='wishlist'&&action!=='compare')return;try{const product=JSON.parse(button.dataset.product||'{}');button.setAttribute('aria-pressed',String(stored(action==='wishlist'?':wishlist':':compare').some(item=>item.productId===product.productId)))}catch{/* Invalid imported product. */}})}
      on(window,'sitebuilder:cart-change',refresh);on(window,'storage',refresh);refresh()
    }
    if(family==='form'||(family==='layout'&&type==='form-container')){
      const form=one<HTMLFormElement>('[data-service-form]')
      if(form){
        const steps=Array.from(form.querySelectorAll<HTMLElement>('[data-form-step]')),next=form.querySelector<HTMLElement>('[data-form-next]'),submitButton=form.querySelector<HTMLButtonElement>('button[type="submit"]')
        if(type==='multi-step-form'&&steps.length===2){
          const setStep=(index:number)=>{steps.forEach((step,i)=>{step.hidden=i!==index;step.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input,textarea').forEach(input=>{input.disabled=i!==index})});if(next)next.hidden=index!==0;if(submitButton)submitButton.hidden=index!==1}
          setStep(0);if(next)on(next,'click',()=>{if(form.reportValidity()){setStep(1);steps[1].querySelector<HTMLElement>('input,textarea')?.focus()}});const back=form.querySelector('[data-form-back]');if(back)on(back,'click',()=>setStep(0))
        }
        const confirm=form.querySelector<HTMLInputElement>('[name="confirmPassword"]'),password=form.querySelector<HTMLInputElement>('[name="password"]')
        if(confirm&&password){const validate=()=>confirm.setCustomValidity(confirm.value===password.value?'':'Passwords must match');on(confirm,'input',validate);on(password,'input',validate)}
        on(form,'submit',event=>{event.preventDefault();if(!form.reportValidity())return
          if(type==='multi-step-form')form.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input,textarea').forEach(input=>{input.disabled=false})
          const data=new FormData(form);data.delete('confirmPassword')
          const fields:Record<string,unknown>={};data.forEach((value,key)=>{if(typeof value==='string'){if(fields[key]===undefined)fields[key]=value;else fields[key]=Array.isArray(fields[key])?[...fields[key] as string[],value]:[fields[key],value]}})
          if(type==='checkout-form'){const items=stored(':cart');if(!items.length){status('Your cart is empty.');return}void submit(p.endpoint,{customer:fields,items},submitButton||undefined)}
          else void submit(form.dataset.endpoint,type==='form-container'?data:fields,submitButton||undefined)
        })
      }
    }
    if (family === 'disclosure') {
      const dialog = one<HTMLDialogElement>('dialog')
      const trigger = one<HTMLButtonElement>('[data-open]')
      if (dialog && trigger) {
        on(trigger, 'click', () => { dialog.showModal(); trigger.setAttribute('aria-expanded', 'true') })
        all('[data-close]').forEach(button => on(button, 'click', () => dialog.close()))
        on(dialog, 'click', event => { if (event.target === dialog) dialog.close() })
        on(dialog, 'close', () => { trigger.setAttribute('aria-expanded', 'false'); trigger.focus() })
      }
      if (type === 'exit-intent-popup' && dialog) {
        const key = 'sitebuilder-exit-intent:' + root.dataset.widgetId
        let shown = false
        try { shown = Boolean(sessionStorage.getItem(key)) } catch { /* Private browsing can still show the popup once per tab. */ }
        if (!shown) {
          on(document, 'mouseleave', event => {
            if ((event as MouseEvent).clientY > 0 || shown) return
            shown = true
            dialog.showModal()
            try { sessionStorage.setItem(key, '1') } catch { /* Not persisted, but still shown this visit. */ }
          })
        }
      }
    }
    if (family === 'carousel') {
      const slides = all('[data-slide]')
      let index = 0
      const show = (next: number) => {
        index = (next + slides.length) % Math.max(slides.length, 1)
        slides.forEach((slide, i) => { slide.hidden = i !== index })
        const output = one('output'); if (output) output.textContent = `${index + 1} / ${slides.length}`
      }
      all('[data-next]').forEach(button => on(button, 'click', () => show(index + 1)))
      all('[data-prev]').forEach(button => on(button, 'click', () => show(index - 1)))
      on(root, 'keydown', event => { const key = (event as KeyboardEvent).key; if (key === 'ArrowRight' || key === 'ArrowLeft') { event.preventDefault(); show(index + (key === 'ArrowRight' ? 1 : -1)) } })
      let paused = false
      on(root, 'mouseenter', () => { paused = true }); on(root, 'mouseleave', () => { paused = false })
      on(root, 'focusin', () => { paused = true }); on(root, 'focusout', () => { paused = false })
      const pause = one('[data-pause]'); if (pause) on(pause, 'click', () => { root.dataset.autoplay = root.dataset.autoplay === 'true' ? 'false' : 'true'; pause.textContent = root.dataset.autoplay === 'true' ? 'Pause' : 'Play' })
      const timer = window.setInterval(() => { if (root.dataset.autoplay === 'true' && !paused && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) show(index + 1) }, Math.max(1000, Number(root.dataset.interval) * 1000 || 5000))
      cleanups.push(() => clearInterval(timer)); show(0)
    }
    if (family === 'clock') {
      const output = one('output')
      const tick = () => {
        if (!output) return
        const target = Date.parse(root.dataset.deadline || '')
        if (!Number.isFinite(target)) { output.textContent = 'Choose a valid target date'; return }
        const seconds = Math.max(0, Math.floor((target - Date.now()) / 1000))
        output.textContent = seconds ? `${Math.floor(seconds / 86400)}d ${Math.floor(seconds / 3600) % 24}h ${Math.floor(seconds / 60) % 60}m ${seconds % 60}s` : root.dataset.expired || 'Complete'
      }
      tick(); const timer = window.setInterval(tick, 1000); cleanups.push(() => clearInterval(timer))
    }
  })
  return () => cleanups.forEach(cleanup => cleanup())
}

export const functionalWidgetScript = `(${mountWidgets.toString()})(document);`
