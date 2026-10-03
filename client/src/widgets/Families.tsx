import { createElement, type CSSProperties, type ReactNode } from 'react'
import type { BlockConfig } from '@/blocks/types'
import { getIcon } from '@/blocks/icons'
import { safeMediaUrl } from '@/blocks/AdditionalWidget'
import { str, rows, strings, number, money, safeUrl } from './values'

type Props = { block: BlockConfig; id: string; family: string; children?: ReactNode }
const Picture = ({src,alt,path}:{src:unknown;alt:unknown;path?:string}) => safeMediaUrl(src) ? <img loading="lazy" data-image={path} src={safeMediaUrl(src)} alt={str(alt)} /> : <div className="fw-image-empty" role="img" aria-label={str(alt,'Image')}>{str(alt,'Choose an image')}</div>
const Link = ({url,children,...rest}:{url:unknown;children:ReactNode} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>,'href'>) => <a href={safeUrl(url)} {...rest}>{children}</a>

export function FamilyContent({block,id,family,children}:Props) {
  const p=block.props, type=block.type, items=rows(p.items)
  const body=<p data-edit="body">{str(p.body)}</p>
  const title=(value:unknown,path='title')=><h4 data-edit={path}>{str(value)}</h4>
  const icon=(name:unknown)=>createElement(getIcon(str(name,'Check')),{size:20,'aria-hidden':true})
  if (family==='layout') return type==='form-container' ? <form data-service-form="" data-endpoint={str(p.endpoint)} data-success={str(p.successMessage)}><div className="fw-children">{children}</div><output role="status"/></form> : <div className="fw-children">{children}</div>
  if (family==='text') {
    switch(type) {
      case 'paragraph':return body
      case 'label':return <label htmlFor={str(p.forId)} data-edit="text">{str(p.text)}</label>
      case 'preformatted':return <pre data-edit="body">{str(p.body)}</pre>
      case 'highlight-text': {const text=str(p.body),word=str(p.highlight),at=word?text.indexOf(word):-1;return <p>{at<0?text:<>{text.slice(0,at)}<mark>{word}</mark>{text.slice(at+word.length)}</>}</p>}
      case 'ordered-list':return <ol start={number(p.start,1)}>{strings(p.items).map((item,i)=><li key={i} data-edit={`items.${i}`}>{item}</li>)}</ol>
      case 'icon-list':return <ul className="fw-clean-list">{items.map((item,i)=><li key={i}>{icon(item.icon)} <span data-edit={`items.${i}.title`}>{str(item.title)}</span></li>)}</ul>
      case 'avatar':return <div className="fw-avatar" style={{width:number(p.size,64,24,240),height:number(p.size,64,24,240)}}>{safeMediaUrl(p.image)?<Picture src={p.image} alt={p.name} path="image"/>:<span aria-label={str(p.name)}>{str(p.name).split(' ').map(s=>s[0]).join('').slice(0,2)}</span>}</div>
      case 'alert':return <div role={p.severity==='error'?'alert':'status'} className="fw-card">{body}{p.dismissible===true&&<button type="button" data-dismiss="" aria-label="Dismiss alert">Dismiss</button>}</div>
      case 'keyboard-shortcut':return <>{strings(p.keys).map((key,i)=><kbd key={i}>{key}</kbd>)}{body}</>
      case 'post-meta':return <p><span data-edit="author">{str(p.author)}</span> · <time dateTime={str(p.date)}>{str(p.date)}</time> · <Link url={p.url}>{str(p.category)}</Link></p>
      case 'product-title':return <p>SKU: <span data-edit="sku">{str(p.sku)}</span></p>
      case 'product-description':return <>{body}<ul>{strings(p.items).map((item,i)=><li key={i} data-edit={`items.${i}`}>{item}</li>)}</ul></>
      case 'product-badge':return <span className="fw-tag">{number(p.stock)>0?`${number(p.stock)} available`:'Out of stock'}</span>
      case 'low-stock-alert':{const stock=number(p.stock),threshold=number(p.threshold,5);return stock<=0?<span className="fw-tag" role="status">Out of stock</span>:stock<=threshold?<span className="fw-tag" role="status">Only {stock} left in stock!</span>:null}
      case 'divider-with-text':return <div className="fw-actions" role="separator"><hr style={{flex:1}}/><span data-edit="body">{str(p.body)}</span><hr style={{flex:1}}/></div>
    }
  }
  if (family==='action') {
    if (type==='clipboard-button') return <><button type="button" data-copy={str(p.text)} data-edit="label">{str(p.label)}</button><output role="status"/></>
    if (type==='email-share') return <a href={`mailto:?subject=${encodeURIComponent(str(p.subject))}&body=${encodeURIComponent(`${str(p.body)} ${str(p.url)}`)}`} data-edit="label">{str(p.label)}</a>
    if (type==='social-share') return <div className="fw-actions">{strings(p.platforms).map(platform=><a key={platform} data-share={platform} data-share-url={str(p.url)} data-share-text={str(p.text)} href="#">{platform}</a>)}</div>
    if (type==='whatsapp-share') return <a href={`https://wa.me/?text=${encodeURIComponent(str(p.text))}`} target="_blank" rel="noopener noreferrer" data-edit="label">{str(p.label)}</a>
    if (type==='sms-share') return <a href={`sms:?&body=${encodeURIComponent(str(p.text))}`} data-edit="label">{str(p.label)}</a>
    return <Link url={p.url} className={type==='link'?'':'fw-button'} download={type==='download-button'?str(p.filename):undefined} target={p.newTab?'_blank':undefined} rel={p.newTab?'noopener noreferrer':undefined}>{type==='icon-button'&&icon(p.icon)} <span data-edit="label">{str(p.label)}</span></Link>
  }
  if (family==='disclosure') {
    if (type==='modal'||type==='drawer'||type==='exit-intent-popup') return <><button type="button" data-open="" aria-haspopup="dialog" aria-controls={id} aria-expanded="false" data-edit="label">{str(p.label)}</button><dialog id={id} aria-labelledby={`${id}-title`}><div className="fw-card"><h3 id={`${id}-title`}>{str(p.title)}</h3>{body}<button type="button" data-close="" autoFocus>Close</button></div></dialog></>
    if (type==='tooltip'||type==='hover-card') return <div className="fw-tooltip"><button type="button" aria-describedby={`${id}-tip`}>{str(p.label)}</button><div role="tooltip" id={`${id}-tip`}>{body}</div></div>
    if (type==='popover'||type==='collapse') return <details><summary>{str(p.label,p.title as string)}</summary><div className="fw-card">{body}</div></details>
    if (type==='notification')return <><button type="button" data-notify="">{str(p.label)}</button><div role="status" data-notice="" hidden>{body}<button type="button" data-dismiss="">Dismiss</button></div></>
    if (type==='cookie-consent')return <div data-consent="" className="fw-card">{body}<div className="fw-actions"><button type="button" data-choice="accepted">{str(p.label)}</button><button type="button" data-choice="declined">{str(p.rejectLabel)}</button></div><output role="status"/></div>
    if (type==='reveal')return <div data-reveal="" style={{transition:`opacity ${number(p.duration,600,0,5000)}ms, transform ${number(p.duration,600,0,5000)}ms`}}>{body}</div>
    if (type==='speed-dial')return <details className="fw-speed-dial"><summary aria-label={str(p.label,'Quick actions')}>{str(p.label,'Quick actions')}</summary><ul className="fw-clean-list">{items.map((item,i)=><li key={i}><Link url={item.url} data-edit={`items.${i}.title`}>{str(item.title)}</Link></li>)}</ul></details>
    if (type==='sticky-cta-bar')return <div data-notice="" className="fw-card fw-sticky-bar">{body}<div className="fw-actions"><Link url={p.url} className="fw-button" data-edit="label">{str(p.label)}</Link><button type="button" data-dismiss="" aria-label="Dismiss offer">✕</button></div></div>
    if (type==='mobile-menu')return <><button type="button" data-open="" aria-haspopup="dialog" aria-controls={id} aria-expanded="false" aria-label={str(p.label,'Menu')}>☰ {str(p.label,'Menu')}</button><dialog id={id} aria-label="Navigation menu"><div className="fw-card"><ul className="fw-clean-list">{items.map((item,i)=><li key={i}><Link url={item.url} data-edit={`items.${i}.title`}>{str(item.title)}</Link></li>)}</ul><button type="button" data-close="" autoFocus>Close</button></div></dialog></>
    if (type==='size-guide')return <><button type="button" data-open="" aria-haspopup="dialog" aria-controls={id} aria-expanded="false" data-edit="label">{str(p.label)}</button><dialog id={id} aria-labelledby={`${id}-title`}><div className="fw-card"><h3 id={`${id}-title`}>{str(p.title)}</h3><div className="fw-table-scroll"><table><thead><tr>{strings(p.columns).map((column,i)=><th key={i}>{column}</th>)}</tr></thead><tbody>{rows(p.rows).map((row,i)=><tr key={i}>{[str(row.title),...str(row.cells).split('|')].slice(0,strings(p.columns).length).map((cell,j)=><td key={j}>{cell.trim()}</td>)}</tr>)}</tbody></table></div><button type="button" data-close="" autoFocus>Close</button></div></dialog></>
    if (type==='image-lightbox-single')return <><button type="button" data-open="" aria-haspopup="dialog" aria-controls={id} aria-expanded="false" aria-label={`Enlarge ${str(p.alt,'image')}`}><Picture src={p.image} alt={p.alt} path="image"/></button><dialog id={id} aria-label={str(p.alt,'Image preview')}><div className="fw-card"><Picture src={p.image} alt={p.alt} path="image"/><button type="button" data-close="" autoFocus>Close</button></div></dialog></>
  }
  if (family==='metric') {
    const value=number(p.value)
    if(type==='pricing-toggle')return <><label>Billing period <select data-billing=""><option value="monthly">Monthly</option><option value="annual">Annually</option></select></label><output className="fw-number" data-price="">{money(p.monthly,p.currency)} / month</output><Link url={p.url} className="fw-button">{str(p.label)}</Link></>
    if(type==='reading-time')return <output data-reading="">Calculating reading time…</output>
    if(type==='scroll-progress')return <progress max="100" value="0" aria-label={str(p.title)}/>
    if(type==='star-rating')return <fieldset><legend>{str(p.title)}</legend>{Array.from({length:number(p.max,5,1,10)},(_,i)=><label key={i}><input type="radio" name={id} value={i+1} defaultChecked={Math.round(value)===i+1} disabled={p.readonly===true}/> {i+1} ★</label>)}</fieldset>
    if(type==='product-rating')return <Link url={p.url} aria-label={`${value} out of ${number(p.max,5)} from ${number(p.count)} reviews`}>{'★'.repeat(Math.round(Math.max(0,Math.min(5,value))))} {value} / {number(p.max,5)} ({number(p.count)} reviews)</Link>
    if(type==='circle-progress'){const percent=number(value/Math.max(1,number(p.max,100))*100,0,0,100);return <div className="fw-circle" role="progressbar" aria-label={str(p.title)} aria-valuenow={value} aria-valuemin={0} aria-valuemax={number(p.max,100)} style={{background:`conic-gradient(var(--color-brand,#6366f1) ${percent}%,var(--color-bg-3,#ddd) 0)`}}><span>{Math.round(percent)}%</span></div>}
    if(type==='product-price'||type==='sale-price')return <><output className="fw-number">{money(value,p.currency)}</output>{type==='sale-price'&&<p><del>{money(p.original,p.currency)}</del> · Save {money(Math.max(0,number(p.original)-value),p.currency)}</p>}</>
    return <output className="fw-number" data-counter="">{str(p.prefix)}{value.toLocaleString('en-US')}{str(p.suffix)}</output>
  }
  if(family==='timer')return <><output className="fw-number" data-timer="">{type==='stopwatch'?'00:00':`${Math.floor(number(p.seconds,300)/60)}:${String(number(p.seconds,300)%60).padStart(2,'0')}`}</output><div className="fw-actions"><button type="button" data-start="">Start</button><button type="button" data-reset="">Reset</button></div></>
  if(family==='clock')return <output className="fw-number" aria-label="Time remaining">Calculating…</output>
  if(family==='carousel')return <><div aria-roledescription="carousel" aria-label={str(p.title)}>{items.map((item,i)=><article data-slide="" hidden={i!==0} className="fw-card" key={i} aria-label={`Slide ${i+1}`}>{item.image?<Picture src={item.image} alt={item.title} path={`items.${i}.image`}/>:null}{title(item.title,`items.${i}.title`)}{item.body?<p data-edit={`items.${i}.body`}>{str(item.body)}</p>:null}{item.role?<p data-edit={`items.${i}.role`}>{str(item.role)}</p>:null}{item.url?<Link url={item.url}>{str(item.title)}</Link>:null}</article>)}</div><div className="fw-actions"><button type="button" data-prev="" aria-label="Previous slide">Previous</button><output aria-live="polite">1 / {items.length}</output><button type="button" data-next="" aria-label="Next slide">Next</button><button type="button" data-pause="">{p.autoplay?'Pause':'Play'}</button></div></>
  if(family==='panels') {
    const panels=['toggle-content','flip-card'].includes(type)?[{title:'First',body:p.first},{title:'Second',body:p.second}]:items
    const tabs=type==='vertical-tabs'||type==='product-tabs'
    return <div className={type==='vertical-tabs'?'fw-vertical-tabs':''}>{tabs&&<div role="tablist" aria-label={str(p.title)} aria-orientation={type==='vertical-tabs'?'vertical':'horizontal'}>{panels.map((item,i)=><button role="tab" type="button" key={i} id={`${id}-tab-${i}`} aria-controls={`${id}-panel-${i}`} aria-selected={i===0} tabIndex={i===0?0:-1} data-tab={i}>{str(item.title)}</button>)}</div>}{panels.map((item,i)=><div className="fw-card" data-panel="" hidden={i!==0} key={i} id={`${id}-panel-${i}`} role={tabs?'tabpanel':undefined} aria-labelledby={tabs?`${id}-tab-${i}`:undefined}>{title(item.title)}<p data-edit={['toggle-content','flip-card'].includes(type)?i===0?'first':'second':`items.${i}.body`}>{str(item.body)}</p></div>)}{!tabs&&<div className="fw-actions">{type==='stepper'&&<button type="button" data-panel-prev="">Previous</button>}<button type="button" data-panel-next="">{str(p.label,'Next step')}</button><output aria-live="polite"/></div>}</div>
  }
  if(family==='navigation') {
    if(type==='previous-next')return <nav aria-label="Adjacent pages" className="fw-actions"><Link url={p.previousUrl}>← {str(p.previousLabel)}</Link><Link url={p.nextUrl}>{str(p.nextLabel)} →</Link></nav>
    if(type==='pagination')return <nav aria-label={str(p.title)} className="fw-actions">{Array.from({length:number(p.total,5,1,100)},(_,i)=><Link key={i} url={`${str(p.url,'?page=')}${i+1}`} aria-current={i+1===number(p.current,1)?'page':undefined}>{i+1}</Link>)}</nav>
    if(type==='language-switcher')return <label>{str(p.title)} <select data-language="" defaultValue=""><option value="" disabled>Choose a language</option>{items.map((item,i)=><option key={i} value={safeUrl(item.url)}>{str(item.title)}</option>)}</select></label>
    if(type==='table-of-contents')return <nav aria-label={str(p.title)}><ol data-toc=""/><p data-toc-empty="">No matching headings yet.</p></nav>
    const links=<ul className={['breadcrumb','tags','follow-buttons','floating-navigation'].includes(type)?'fw-actions fw-clean-list':'fw-clean-list'}>{items.map((item,i)=><li key={i}>{Boolean(item.group)&&<small>{str(item.group)}</small>}<Link url={item.url} download={type==='file-downloads'?str(item.filename):undefined} aria-current={type==='breadcrumb'&&i===items.length-1?'page':undefined} data-edit={`items.${i}.title`}>{str(item.title)}</Link>{item.count!==undefined&&<span> ({number(item.count)})</span>}{Boolean(item.format)&&<small> {str(item.format)}</small>}{Boolean(item.body)&&<p>{str(item.body)}</p>}</li>)}</ul>
    return <nav aria-label={str(p.title)}>{['dropdown-menu','mega-menu'].includes(type)?<details><summary>{str(p.title)}</summary>{links}</details>:links}</nav>
  }
  if(family==='media') {
    if(type==='youtube'||type==='vimeo'){const videoId=str(p.videoId).replace(type==='vimeo'?/[^0-9]/g:/[^a-zA-Z0-9_-]/g,'');return <iframe className="fw-video" title={str(p.title)} src={type==='youtube'?`https://www.youtube-nocookie.com/embed/${videoId}?start=${number(p.start,0,0)}`:`https://player.vimeo.com/video/${videoId}`} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy"/>}
    if(type==='iframe')return <iframe title={str(p.title)} src={safeUrl(p.url)} sandbox="allow-forms allow-popups" loading="lazy" style={{width:'100%',height:number(p.height,320,80,1200),border:0}}/>
    if(type==='video-background')return <div className="fw-video-background"><video src={safeMediaUrl(p.src)||undefined} poster={safeMediaUrl(p.poster)||undefined} muted loop autoPlay={p.autoplay===true} playsInline controls preload="metadata" aria-label={str(p.title)}/><div>{body}</div></div>
    if(type==='audio-playlist')return <><label>Track <select data-track="">{items.map((item,i)=><option value={safeMediaUrl(item.url)} key={i}>{str(item.title)}</option>)}</select></label><audio controls preload="none" src={safeMediaUrl(items[0]?.url)||undefined} aria-label={str(p.title)}/></>
    if(type==='before-after')return <><div className="fw-compare"><Picture src={p.beforeImage} alt={p.beforeAlt} path="beforeImage"/><div data-after="" style={{clipPath:`inset(0 ${100-number(p.value,50,0,100)}% 0 0)`}}><Picture src={p.afterImage} alt={p.afterAlt} path="afterImage"/></div></div><label>Reveal after image <input data-compare="" type="range" min="0" max="100" defaultValue={number(p.value,50,0,100)}/></label></>
    if(type==='image-hotspot')return <div className="fw-hotspot-image"><Picture src={p.image} alt={p.alt} path="image"/><details style={{position:'absolute',left:`${number(p.x,50,0,90)}%`,top:`${number(p.y,50,0,90)}%`}}><summary aria-label="Show image detail">ⓘ</summary><div className="fw-card">{body}</div></details></div>
    if(type==='image-zoom')return <><div className="fw-zoom"><div data-zoom-image=""><Picture src={p.image} alt={p.alt} path="image"/></div></div><label>Zoom <input type="range" min="1" max={number(p.maxZoom,3,1,10)} step="0.1" defaultValue="1" data-zoom=""/></label></>
    if(type==='media-card')return <article><Link url={p.url}><Picture src={p.image} alt={p.alt} path="image"/><span className="fw-tag">{str(p.mediaType)}</span>{body}</Link></article>
    if(type==='pdf-viewer')return <><iframe title={str(p.title)} src={safeUrl(p.url)} style={{width:'100%',height:number(p.height,600,200,2000),border:'1px solid #888'}}/><p><Link url={p.url}>Download PDF</Link></p></>
    if(type==='video-playlist')return <><label>Video <select data-video-track="">{items.map((item,i)=><option value={safeMediaUrl(item.url)} key={i}>{str(item.title)}</option>)}</select></label><video controls preload="none" src={safeMediaUrl(items[0]?.url)||undefined} aria-label={str(p.title)}/></>
    return <figure><picture>{safeMediaUrl(p.mobileImage)&&<source media="(max-width:767px)" srcSet={safeMediaUrl(p.mobileImage)}/>}<Picture src={p.image} alt={p.alt} path="image"/></picture><figcaption data-edit="caption">{str(p.caption)}</figcaption></figure>
  }
  if(family==='input')return <FormControl block={block} id={id}/>
  if(family==='form')return <ProviderForm block={block} id={id}/>
  if(family==='cards')return <article className="fw-card">
    {p.image!==undefined&&<Picture src={p.image} alt={p.title} path="image"/>}{Boolean(p.icon)&&icon(p.icon)}
    {Boolean(p.role)&&<p data-edit="role">{str(p.role)}</p>}{Boolean(p.body)&&body}{p.price!==undefined&&<p className="fw-number">{typeof p.price==='number'?money(p.price,p.currency):str(p.price)}{p.period?` / ${str(p.period)}`:''}</p>}
    {Boolean(p.duration)&&<p data-edit="duration">{str(p.duration)}</p>}{Boolean(p.name)&&<footer data-edit="name">{str(p.name)}</footer>}{p.rating!==undefined&&<p aria-label={`${number(p.rating)} stars`}>{'★'.repeat(number(p.rating,5,0,5))}</p>}
    {Boolean(p.author)&&<p><span data-edit="author">{str(p.author)}</span> · <time dateTime={str(p.date)}>{str(p.date)}</time> · <span data-edit="category">{str(p.category)}</span></p>}
    {Boolean(p.items)&&<ul>{strings(p.items).map((item,i)=><li data-edit={`items.${i}`} key={i}>{item}</li>)}</ul>}
    {Boolean(p.phone)&&<p><a href={`tel:${str(p.phone).replace(/[^+0-9]/g,'')}`}>{str(p.phone)}</a></p>}{Boolean(p.email)&&<p><a href={`mailto:${encodeURIComponent(str(p.email))}`}>{str(p.email)}</a></p>}{Boolean(p.address)&&<address data-edit="address">{str(p.address)}</address>}
    {Boolean(p.code)&&<><button type="button" data-copy={str(p.code)}>Copy {str(p.code)}</button><output role="status"/></>}{p.count!==undefined&&<p>{number(p.count)} products</p>}
    {Boolean(p.url)&&<Link url={p.url} className="fw-button">{str(p.label,'Read more')}</Link>}
  </article>
  if(family==='collection') {
    if(type==='read-more')return <><p data-excerpt="">{str(p.body).slice(0,number(p.limit,100,1))}…</p><p data-full="" hidden>{str(p.body)}</p><button type="button" data-more-text="" aria-expanded="false">{str(p.label)}</button></>
    return <>{['search-widget','search-results'].includes(type)&&<label>Search records <input type="search" data-filter=""/></label>}
    {type==='gallery-filter'&&<div className="fw-filter-bar" role="group" aria-label="Filter by category"><button type="button" data-category-filter="" aria-pressed="true">All</button>{[...new Set(items.map(item=>str(item.category)).filter(Boolean))].map(category=><button type="button" key={category} data-category-filter={category} aria-pressed="false">{category}</button>)}</div>}
    <div className={`fw-grid ${type==='masonry-gallery'?'fw-masonry':''} ${['post-list','timeline','process'].includes(type)?'fw-list':''}`} style={{'--fw-columns':number(p.columns,3,1,6)} as CSSProperties}>{items.map((item,i)=><article className="fw-card" data-item="" data-category={item.category?str(item.category):undefined} key={i} hidden={type==='load-more'&&i>=number(p.batch,1,1)}>
      {item.image!==undefined&&(type==='lightbox-gallery'?<button type="button" data-lightbox={i} aria-label={`Enlarge ${str(item.title)}`}><Picture src={item.image} alt={item.title} path={`items.${i}.image`}/></button>:<Picture src={item.image} alt={item.title} path={`items.${i}.image`}/>)}
      {type==='process'&&<strong>{i+1}.</strong>}{title(item.title,`items.${i}.title`)}{Boolean(item.date)&&<time dateTime={str(item.date)}>{str(item.date)}</time>}{Boolean(item.body)&&<p data-edit={`items.${i}.body`}>{str(item.body)}</p>}{Boolean(item.duration)&&<small>{str(item.duration)}</small>}{Boolean(item.author)&&<small>{str(item.author)} · {str(item.category)}</small>}{item.count!==undefined&&<small>{number(item.count)} products</small>}{Boolean(item.url)&&<Link url={item.url}>Explore {str(item.title)}</Link>}
    </article>)}</div>{type==='load-more'&&<button type="button" data-load-more="">{str(p.label)}</button>}{['search-widget','search-results'].includes(type)&&<output role="status"/>}{type==='lightbox-gallery'&&<dialog aria-label="Image preview"><div className="fw-card"><img data-lightbox-image="" alt=""/><p data-lightbox-caption=""/><button type="button" data-close="">Close</button></div></dialog>}</>
  }
  if(family==='table')return <>{type==='data-table'&&<label>Search table <input type="search" data-filter=""/></label>}<div className="fw-table-scroll"><table><caption>{str(p.title)}</caption><thead><tr>{strings(p.columns).map((column,i)=><th scope="col" key={i}>{type==='data-table'?<button type="button" data-sort={i}>{column}</button>:column}</th>)}</tr></thead><tbody>{rows(p.rows).map((row,i)=><tr key={i}>{[str(row.title),...str(row.cells).split('|')].slice(0,strings(p.columns).length).map((cell,j)=><td key={j}>{cell.trim()}</td>)}</tr>)}</tbody></table></div>{type==='data-table'&&<div className="fw-actions"><button type="button" data-table-prev="">Previous page</button><output aria-live="polite"/><button type="button" data-table-next="">Next page</button></div>}</>
  if(family==='commerce')return <Commerce block={block}/>
  if(family==='chart')return <Chart block={block}/>
  if(family==='data')return <DataContent block={block} id={id}/>
  return null
}

function FormControl({block,id}:{block:BlockConfig;id:string}) {
  const p=block.props, type=block.type
  if(type==='submit-button'||type==='reset-button')return <button type={type==='submit-button'?'submit':'reset'} data-edit="label">{str(p.label)}</button>
  const inputType=type.startsWith('input-')?type.slice(6):type==='toggle'?'checkbox':type==='file-upload'?'file':type==='hidden-field'?'hidden':type
  const common={id,name:str(p.name,id),required:p.required===true}
  let control:ReactNode
  if(type==='textarea'||type==='gift-message')control=<textarea {...common} rows={number(p.rows,4,1,30)} placeholder={str(p.placeholder)} defaultValue={str(p.value)}/>
  else if(type==='select'||type==='multi-select')control=<select {...common} multiple={type==='multi-select'} defaultValue={type==='multi-select'?[]:''}>{type==='select'&&<option value="" disabled>Choose an option</option>}{strings(p.options).map((option,i)=><option key={i} value={option}>{option}</option>)}</select>
  else if(type==='radio')return <fieldset><legend>{str(p.title)}</legend>{strings(p.options).map((option,i)=><label key={i}><input type="radio" name={str(p.name,id)} value={option} required={p.required===true}/> {option}</label>)}</fieldset>
  else control=<input {...common} type={inputType} role={type==='toggle'?'switch':undefined} placeholder={str(p.placeholder)} defaultValue={type==='file-upload'?undefined:typeof p.value==='number'?p.value:str(p.value)} defaultChecked={p.checked===true} min={p.min===undefined?undefined:number(p.min)} max={p.max===undefined?undefined:number(p.max)} step={p.step===undefined?undefined:number(p.step,1,0.001)} accept={str(p.accept)||undefined} multiple={p.multiple===true}/>
  return <>{inputType!=='hidden'&&<label htmlFor={id}>{str(p.title)}{p.required?' *':''}</label>}{control}{type==='range'&&<output>{number(p.value)}</output>}</>
}

function ProviderForm({block,id}:{block:BlockConfig;id:string}) {
  const p=block.props,t=block.type
  if(t==='search-form')return <form action={safeUrl(p.url)} method="get"><label htmlFor={id}>Search query</label><input id={id} name={str(p.parameter,'q')} type="search" required/><button type="submit">{str(p.label)}</button></form>
  const field=(name:string,label:string,type='text',required=true)=><label>{label}<input name={name} type={type} required={required} minLength={type==='password'?8:undefined}/></label>
  return <>{t==='comments-ui'&&rows(p.items).map((row,i)=><blockquote key={i}><strong data-edit={`items.${i}.name`}>{str(row.name)}</strong><p data-edit={`items.${i}.body`}>{str(row.body)}</p></blockquote>)}<form data-service-form="" data-endpoint={str(p.endpoint)} data-success={str(p.successMessage)} data-form-type={t}>
    {t==='coupon'?field('coupon','Coupon code'):<><div data-form-step="">{!['login-form','forgot-password'].includes(t)&&field('name','Your name')}{field('email','Email address','email')}{['login-form','register-form'].includes(t)&&field('password','Password','password')}{t==='register-form'&&field('confirmPassword','Confirm password','password')}</div>
    {t==='multi-step-form'&&<button type="button" data-form-next="">Continue</button>}
    <div data-form-step="" hidden={t==='multi-step-form'}>{['multi-step-form','survey-form','comments-ui','appointment-request','rsvp-form','job-application-form'].includes(t)&&<label>{t==='comments-ui'?'Comment':'Your message'}<textarea name="message" required rows={4}/></label>}{t==='survey-form'&&<label>Rating<select name="rating" required>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label>}{t==='appointment-request'&&<>{field('date','Preferred date','date')}{field('service','Service requested')}</>}{t==='checkout-form'&&<>{field('address','Street address')}{field('city','City')}{field('postalCode','Postal code')}{field('country','Country')}</>}{t==='multi-step-form'&&<button type="button" data-form-back="">Back</button>}</div></>}
    <button type="submit" hidden={t==='multi-step-form'}>{str(p.label)}</button><output role="status"/>
  </form></>
}

function Commerce({block}:{block:BlockConfig}) {
  const p=block.props,t=block.type
  if(t==='quantity-selector')return <div className="fw-actions"><button type="button" data-quantity-step="-1" aria-label="Decrease quantity">−</button><input aria-label={str(p.title)} type="number" min={number(p.min,1,1)} max={number(p.max,20,1)} defaultValue={number(p.value,1,1)}/><button type="button" data-quantity-step="1" aria-label="Increase quantity">+</button></div>
  if(['cart-summary','mini-cart','cart-item'].includes(t)){const content=<><div data-cart-items=""/><output data-cart-total="" aria-live="polite">Cart is empty</output>{t==='cart-summary'&&<button type="button" data-checkout="">{str(p.label)}</button>}<output role="status"/></>;return t==='mini-cart'?<details><summary>{str(p.label)}</summary>{content}</details>:content}
  if(t==='product-variations')return <><label>Product option <select data-variation="">{rows(p.items).map((item,i)=><option key={i} value={i}>{str(item.title)} — {money(item.price,p.currency)}</option>)}</select></label><button type="button" data-add-variation="">Add selected option</button><output role="status"/></>
  if(t==='free-shipping-progress')return <div data-shipping-progress=""><progress max={number(p.threshold,75,1)} value="0"/><p data-shipping-message="">Add items to see your free shipping progress.</p></div>
  if(t==='wishlist-summary')return <><div data-wishlist-items=""/><output data-wishlist-empty="" aria-live="polite">Your wishlist is empty.</output></>
  const products=Array.isArray(p.items)?rows(p.items):[p]
  return <><div className={t==='product-list'?'fw-list':'fw-grid'} style={{'--fw-columns':number(p.columns,3,1,6)} as CSSProperties}>{products.map((item,i)=><article className="fw-card" key={i}>
    {!['add-to-cart','buy-now','wishlist','compare-product'].includes(t)&&<><Picture src={item.image} alt={item.title} path={p.items?`items.${i}.image`:'image'}/><h4 data-edit={p.items?`items.${i}.title`:'title'}>{str(item.title)}</h4><p>{str(item.description)}</p><strong>{money(item.price,item.currency??p.currency)}</strong></>}
    <button type="button" data-product={JSON.stringify(item)} data-commerce-action={t==='wishlist'?'wishlist':t==='compare-product'?'compare':t==='buy-now'?'buy':'add'} aria-pressed={t==='wishlist'||t==='compare-product'?false:undefined}>{str(p.label,'Add to cart')}</button>
  </article>)}</div><output role="status"/></>
}

function Chart({block}:{block:BlockConfig}) {
  const data=rows(block.props.items), max=Math.max(1,...data.map(d=>number(d.value,0,0))), total=data.reduce((a,d)=>a+number(d.value,0,0),0)||1
  const colors=['#6366f1','#14b8a6','#f59e0b','#ec4899','#3b82f6']
  const stops=data.map((d,i)=>{const start=data.slice(0,i).reduce((sum,item)=>sum+number(item.value,0,0),0)/total*100;return `${colors[i%colors.length]} ${start}% ${start+number(d.value,0,0)/total*100}%`})
  return <figure>{block.type==='bar-chart'?<div className="fw-bars">{data.map((d,i)=><div key={i}><span>{str(d.title)}</span><div style={{width:`${number(d.value,0,0)/max*100}%`,background:colors[i%colors.length],height:20}}/><strong>{number(d.value)}</strong></div>)}</div>:block.type==='line-chart'?<svg viewBox="0 0 400 180" role="img" aria-label={str(block.props.title)}><polyline fill="none" stroke="#6366f1" strokeWidth="3" points={data.map((d,i)=>`${20+i*360/Math.max(data.length-1,1)},${160-number(d.value,0,0)/max*140}`).join(' ')}/>{data.map((d,i)=><circle key={i} cx={20+i*360/Math.max(data.length-1,1)} cy={160-number(d.value,0,0)/max*140} r="5" fill={colors[i%colors.length]}><title>{`${str(d.title)}: ${number(d.value)}`}</title></circle>)}</svg>:<div className="fw-pie" role="img" aria-label={str(block.props.title)} style={{background:`conic-gradient(${stops.length?stops.join(','):'#ddd 0% 100%'})`}}>{block.type==='doughnut-chart'&&<span/>}</div>}<figcaption><ul>{data.map((d,i)=><li key={i}><span style={{color:colors[i%colors.length]}}>●</span> {str(d.title)}: {number(d.value)}</li>)}</ul></figcaption></figure>
}

function JsonTree({value,name='Root'}:{value:unknown;name?:string}):ReactNode {
  if(value!==null&&typeof value==='object')return <details open><summary>{name} ({Object.keys(value).length})</summary><ul>{Object.entries(value).map(([key,item])=><li key={key}><JsonTree value={item} name={key}/></li>)}</ul></details>
  return <span>{name}: <code>{JSON.stringify(value)}</code></span>
}
function DataContent({block,id}:{block:BlockConfig;id:string}) {
  const p=block.props,t=block.type
  if(t==='json-viewer'){let value:unknown;try{value=JSON.parse(str(p.json))}catch{return <p role="alert">Invalid JSON. Check the content field.</p>}return <JsonTree value={value}/>}
  if(t==='custom-code')return <iframe title={str(p.title)} sandbox="allow-scripts" srcDoc={str(p.code)} style={{width:'100%',height:number(p.height,180,80,1200),border:'1px solid #888'}}/>
  if(t==='progress-tracker')return <><fieldset><legend>{str(p.title)}</legend>{strings(p.items).map((item,i)=><label key={i}><input type="checkbox" data-check-item=""/>{item}</label>)}</fieldset><progress max={strings(p.items).length||1} value="0"/><output aria-live="polite">0 completed</output></>
  if(t==='calendar')return <><div className="fw-actions"><button type="button" data-month-step="-1" aria-label="Previous month">Previous</button><strong data-month-label=""/><button type="button" data-month-step="1" aria-label="Next month">Next</button></div><div className="fw-calendar" data-calendar="" role="group" aria-label="Dates"/><output aria-live="polite"/></>
  if(t==='calculator')return <><label htmlFor={`${id}-first`}>First number</label><input id={`${id}-first`} data-first="" type="number" defaultValue={number(p.first)}/><label>Operation<select data-operation=""><option value="+">Add</option><option value="-">Subtract</option><option value="*">Multiply</option><option value="/">Divide</option></select></label><label>Second number<input data-second="" type="number" defaultValue={number(p.second)}/></label><output className="fw-number" aria-live="polite"/></>
  if(t==='percentage-calculator')return <><label>Amount<input data-first="" type="number" defaultValue={number(p.value)}/></label><label>Percentage<input data-second="" type="number" defaultValue={number(p.percent)}/></label><output className="fw-number" aria-live="polite"/></>
  if(t==='unit-converter')return <><label>Length<input data-first="" type="number" defaultValue={number(p.value,1)}/></label>{['From','To'].map((label,i)=><label key={label}>{label}<select data-unit={i} defaultValue={i?'km':'m'}>{['m','km','mi','ft'].map(unit=><option key={unit}>{unit}</option>)}</select></label>)}<output className="fw-number" aria-live="polite"/></>
  if(t==='currency-converter')return <><label>Amount<input data-first="" type="number" defaultValue={number(p.value,100)}/></label>{['From','To'].map((label,i)=><label key={label}>{label}<select data-currency={i} defaultValue={i?'EUR':'USD'}>{['USD','EUR','GBP','INR','AUD','CAD'].map(code=><option key={code}>{code}</option>)}</select></label>)}<output className="fw-number" aria-live="polite"/><p className="fw-hint">Rates are illustrative. Connect a live provider for accurate, current conversion.</p></>
  if(t==='age-calculator')return <><label>Date of birth<input type="date" data-birthdate="" defaultValue={str(p.birthdate)}/></label><output className="fw-number" aria-live="polite"/></>
  if(t==='bmi-calculator')return <><label>Height (cm)<input type="number" data-height="" defaultValue={number(p.heightCm,170,50,250)}/></label><label>Weight (kg)<input type="number" data-weight="" defaultValue={number(p.weightKg,70,20,300)}/></label><output className="fw-number" aria-live="polite"/></>
  if(t==='tip-calculator')return <><label>Bill amount<input type="number" data-bill="" defaultValue={number(p.bill,50,0)}/></label><label>Tip %<input type="number" data-tip="" defaultValue={number(p.tipPercent,15,0,100)}/></label><label>People<input type="number" data-people="" min="1" defaultValue={number(p.people,1,1)}/></label><output className="fw-number" aria-live="polite"/></>
  if(t==='loan-calculator')return <><label>Loan amount<input type="number" data-principal="" defaultValue={number(p.principal,200000,0)}/></label><label>Annual interest rate %<input type="number" step="0.1" data-rate="" defaultValue={number(p.annualRate,6.5,0,50)}/></label><label>Term (years)<input type="number" data-years="" defaultValue={number(p.years,20,1,50)}/></label><output className="fw-number" aria-live="polite"/></>
  if(t==='donation-progress'){const goal=Math.max(1,number(p.goal,10000,1)),raised=Math.min(goal,number(p.raised,0,0));const percent=Math.round(raised/goal*100);return <><progress max={goal} value={raised} aria-label="Amount raised"/><p>{money(raised,p.currency)} raised of {money(goal,p.currency)} goal ({percent}%)</p></>}
  if(t==='live-clock')return <time data-live-clock="">Loading…</time>
  if(t==='typewriter-text')return <p data-typewriter={str(p.body)} data-speed={number(p.speed,40,5,500)} aria-label={str(p.body)}/>
  if(t==='marquee-text')return <div className="fw-marquee" aria-label={str(p.body)}><span aria-hidden="true">{str(p.body)}</span></div>
  if(t==='random-quote'){const list=rows(p.items),first=list[0]??{};return <><blockquote data-quote="">{str(first.quote)}</blockquote><p data-author="">— {str(first.author)}</p><button type="button" data-next-quote="">Show another quote</button></>}
  if(t==='poll-widget')return <form data-poll=""><fieldset><legend>{str(p.title)}</legend>{strings(p.items).map((option,i)=><label key={i}><input type="radio" name="poll-option" value={option} required/> {option}</label>)}</fieldset><button type="submit">Vote</button><output role="status"/></form>
  if(t==='sortable-list')return <><ol data-sortable="">{strings(p.items).map((item,i)=><li key={i} data-sortable-item=""><span>{item}</span><span className="fw-actions"><button type="button" data-move="-1" aria-label={`Move ${item} up`}>↑</button><button type="button" data-move="1" aria-label={`Move ${item} down`}>↓</button></span></li>)}</ol><output aria-live="polite"/></>
  if(t==='signature-pad')return <div className="fw-signature"><canvas data-signature-canvas="" aria-label="Draw your signature here"/><div className="fw-actions"><button type="button" data-signature-clear="">Clear</button><output aria-live="polite"/></div></div>
  if(t==='otp-input'){const length=Math.max(3,Math.min(10,number(p.length,6)));return <div className="fw-otp" role="group" aria-label={str(p.title)}>{Array.from({length},(_,i)=><input key={i} type="text" inputMode="numeric" maxLength={1} data-otp-digit={i} aria-label={`Digit ${i+1}`}/>)}</div>}
  if(t==='dual-range-slider'){const min=number(p.min,0),max=number(p.max,1000,min+1);return <><div className="fw-actions"><input type="range" data-range-min="" min={min} max={max} defaultValue={number(p.valueMin,min,min,max)}/><input type="range" data-range-max="" min={min} max={max} defaultValue={number(p.valueMax,max,min,max)}/></div><output aria-live="polite"/></>}
  if(t==='like-button')return <><button type="button" data-like="" aria-pressed="false">♥ <span data-edit="label">{str(p.label)}</span></button><output aria-live="polite"/></>
  if(t==='emoji-reactions')return <div className="fw-actions" role="group" aria-label="React to this">{strings(p.items).map((emoji,i)=><button type="button" key={i} data-reaction={emoji} aria-label={`React with ${emoji}`}>{emoji}</button>)}<output role="status"/></div>
  if(t==='was-this-helpful')return <><div className="fw-actions"><button type="button" data-helpful="yes">Yes</button><button type="button" data-helpful="no">No</button></div><output role="status"/></>
  if(t==='date-calculator')return <><label>From<input type="date" data-date-from=""/></label><label>To<input type="date" data-date-to=""/></label><output className="fw-number" aria-live="polite"/></>
  if(t==='random-number-generator')return <><div className="fw-actions"><label>Min<input type="number" data-rand-min="" defaultValue={number(p.min,1)}/></label><label>Max<input type="number" data-rand-max="" defaultValue={number(p.max,100)}/></label></div><button type="button" data-randomize="">Generate</button><output className="fw-number" aria-live="polite"/></>
  if(t==='text-case-converter')return <><label>Your text<textarea data-case-input="" rows={4}/></label><div className="fw-actions"><button type="button" data-case="upper">UPPER CASE</button><button type="button" data-case="lower">lower case</button><button type="button" data-case="title">Title Case</button></div><label>Result<textarea data-case-output="" rows={4} readOnly/></label></>
  if(t==='simple-quiz')return <fieldset data-quiz=""><legend>{str(p.question)}</legend>{strings(p.options).map((option,i)=><label key={i}><input type="radio" name="quiz-answer" value={i}/> {option}</label>)}<div className="fw-actions"><button type="button" data-quiz-check="">Check answer</button><output role="status"/></div></fieldset>
  if(t==='color-picker-tool')return <><span className="fw-swatch" data-swatch="" style={{background:str(p.value,'#6366f1')}}/><input type="color" data-color-input="" defaultValue={str(p.value,'#6366f1')}/><output aria-live="polite">{str(p.value,'#6366f1')}</output></>
  if(t==='roman-numeral-converter')return <><label>Number (1–3999)<input type="number" data-roman-number="" min={1} max={3999} defaultValue={number(p.value,1994,1,3999)}/></label><output className="fw-number" aria-live="polite"/></>
  if(t==='percentage-change-calculator')return <><label>From<input type="number" data-first="" defaultValue={number(p.from,100)}/></label><label>To<input type="number" data-second="" defaultValue={number(p.to,120)}/></label><output className="fw-number" aria-live="polite"/></>
  if(t==='bmr-calculator')return <><label>Age<input type="number" data-age="" defaultValue={number(p.age,30,1,120)}/></label><label>Height (cm)<input type="number" data-height="" defaultValue={number(p.heightCm,170,50,250)}/></label><label>Weight (kg)<input type="number" data-weight="" defaultValue={number(p.weightKg,70,20,300)}/></label><label>Sex<select data-sex="" defaultValue={str(p.sex,'female')}><option value="female">Female</option><option value="male">Male</option></select></label><output className="fw-number" aria-live="polite"/></>
  if(t==='interest-calculator')return <><label>Starting amount<input type="number" data-principal="" defaultValue={number(p.principal,1000,0)}/></label><label>Annual interest rate %<input type="number" step="0.1" data-rate="" defaultValue={number(p.annualRate,5,0,50)}/></label><label>Years<input type="number" data-years="" defaultValue={number(p.years,5,1,50)}/></label><label><input type="checkbox" data-compound="" defaultChecked={p.compound!==false}/> Compound annually</label><output className="fw-number" aria-live="polite"/></>
  if(t==='random-color-generator')return <><span className="fw-swatch" data-swatch=""/><button type="button" data-randomize-color="">Generate</button><output aria-live="polite" data-copy="">Click generate</output></>
  if(t==='password-generator')return <><label>Length<input type="number" data-length="" min={6} max={64} defaultValue={number(p.length,16,6,64)}/></label><output className="fw-number" data-password="" aria-live="polite"/><div className="fw-actions"><button type="button" data-generate-password="">Generate</button><button type="button" data-copy-password="">Copy</button><output role="status"/></div></>
  if(t==='print-button')return <button type="button" data-print="" data-edit="label">{str(p.label)}</button>
  if(t==='share-page-button')return <><button type="button" data-share-page="" data-edit="label">{str(p.label)}</button><output role="status"/></>
  return null
}


