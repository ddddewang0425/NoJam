import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Eye, Edit3, Indent, Outdent } from 'lucide-react'
import useDayNoteStore from '../../store/dayNoteStore'

const DAYS_FULL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
const BULLET_MK = ['•', '◦', '▪']

// ── Helpers ───────────────────────────────────────────────────────────────────
function toRoman(n) {
  return [[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],
          [50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']]
    .reduce((s,[v,c])=>{ while(n>=v){s+=c;n-=v} return s },'')
}
function markerStr(type, level, counter) {
  if (type==='bullet') return BULLET_MK[level%3]
  const m = level%3; if(m===0) return `${counter}.`; if(m===1) return `${String.fromCharCode(96+counter)}.`; return `${toRoman(counter)}.`
}
let _u=0; const uid=()=>`b${++_u}`
const newBlock=(type='text',content='',level=0)=>({id:uid(),type,content,level})

// Compute per-block numbered counters
function addCounters(blocks) {
  const lc={}
  return blocks.map(b=>{
    if(b.type==='numbered'){const l=b.level;Object.keys(lc).forEach(k=>{if(+k>l)delete lc[k]});lc[l]=(lc[l]||0)+1;return{...b,counter:lc[l]}}
    if(!['bullet','numbered'].includes(b.type))Object.keys(lc).forEach(k=>delete lc[k])
    return{...b,counter:1}
  })
}

// ── Serialize / Deserialize ───────────────────────────────────────────────────
function serialize(blocks) {
  return blocks.map(b=>{
    const sp='  '.repeat(b.level)
    if(b.type==='h1') return `# ${b.content}`
    if(b.type==='h2') return `## ${b.content}`
    if(b.type==='h3') return `### ${b.content}`
    if(b.type==='divider') return '---'
    if(b.type==='bullet') return `${sp}- ${b.content}`
    if(b.type==='numbered'){const m=b.level%3===1?'a':b.level%3===2?'i':'1';return `${sp}${m}. ${b.content}`}
    return b.content
  }).join('\n')
}
function deserialize(text) {
  if(!text?.trim()) return [newBlock()]
  return text.split('\n').map(line=>{
    if(line.trim()==='---') return newBlock('divider')
    if(/^# /.test(line)) return newBlock('h1',line.slice(2))
    if(/^## /.test(line)) return newBlock('h2',line.slice(3))
    if(/^### /.test(line)) return newBlock('h3',line.slice(4))
    const sp=(line.match(/^( *)/)||['',''])[1].length; const lv=Math.floor(sp/2); const tr=line.slice(sp)
    if(/^[-*] /.test(tr)) return newBlock('bullet',tr.slice(2),lv)
    if(/^(\d+|[a-z]|[ivxlcdm]+)\. /.test(tr)) return newBlock('numbered',tr.replace(/^[^\s]+\s/,''),lv)
    return newBlock('text',line)
  })
}

// ── DOM block builder ─────────────────────────────────────────────────────────
const TYPE_CLS = {text:'font-size:0.875rem;color:#1f2937',h1:'font-size:1.3rem;font-weight:800;color:#111827',h2:'font-size:1.1rem;font-weight:700;color:#111827',h3:'font-size:1rem;font-weight:600;color:#1f2937',bullet:'font-size:0.875rem;color:#1f2937',numbered:'font-size:0.875rem;color:#1f2937',divider:''}

function buildEl(b) {
  const div = document.createElement('div')
  div.dataset.id = b.id; div.dataset.bt = b.type; div.dataset.lv = String(b.level)
  div.style.cssText = `min-height:1.5rem;line-height:1.65;padding-left:${b.level*18}px;display:flex;align-items:baseline;${TYPE_CLS[b.type]||''}`
  if (b.type==='divider') {
    div.contentEditable='false'
    div.style.cssText += ';padding:4px 0'
    const hr=document.createElement('hr'); hr.style.cssText='border:none;border-top:1px solid #e5e7eb;flex:1'; div.appendChild(hr)
    return div
  }
  if (b.type==='bullet'||b.type==='numbered') {
    const mk=document.createElement('span')
    mk.className='dne-mk'; mk.contentEditable='false'
    mk.style.cssText='color:#9ca3af;user-select:none;-webkit-user-select:none;flex-shrink:0;margin-right:5px;min-width:1.4em;text-align:right'
    mk.textContent=markerStr(b.type,b.level,b.counter||1)
    div.appendChild(mk)
  }
  const ct=document.createElement('span'); ct.className='dne-ct'; ct.style.cssText='flex:1;min-width:0;white-space:pre-wrap;word-break:break-word;outline:none'
  if(b.content) ct.textContent=b.content; else ct.appendChild(document.createElement('br'))
  div.appendChild(ct)
  return div
}

// Get user-text content (excluding marker span)
function getContent(el) {
  const ct = el.querySelector('.dne-ct') || el
  let t = ''
  for (const n of ct.childNodes) {
    if (n.nodeType === 3) t += n.textContent
    else if (n.nodeName === 'BR') t += '\n'
    else if (n.nodeType === 1 && !n.classList.contains('dne-mk')) t += n.innerText || n.textContent || ''
  }
  if (t.endsWith('\n') && ct.lastChild?.nodeName === 'BR') t = t.slice(0, -1)
  return t
}

// Parse all blocks from DOM
function parseDom(container) {
  return Array.from(container.children).map(el=>({
    id:el.dataset.id||uid(), type:el.dataset.bt||'text',
    level:parseInt(el.dataset.lv||'0'), content:getContent(el)
  }))
}

// Cursor helpers
function cursorToEnd(el) {
  const sel=window.getSelection(); const r=document.createRange()
  const ct=el.querySelector('.dne-ct')||el
  r.selectNodeContents(ct); r.collapse(false); sel.removeAllRanges(); sel.addRange(r)
}
function cursorToStart(el) {
  setTimeout(() => {
    const sel=window.getSelection(); const r=document.createRange()
    const ct=el.querySelector('.dne-ct')||el
    r.selectNodeContents(ct); r.collapse(true); sel.removeAllRanges(); sel.addRange(r)
  }, 0)
}
function isAtStart(el) {
  const sel=window.getSelection(); if(!sel?.isCollapsed) return false
  try{const r=sel.getRangeAt(0),tr=document.createRange(),ct=el.querySelector('.dne-ct')||el; tr.setStart(ct,0); tr.setEnd(r.startContainer,r.startOffset); return tr.toString().length===0}catch{return false}
}
function isAtEnd(el) {
  const sel = window.getSelection()
  if (!sel || !sel.isCollapsed) return false
  const ct = el.querySelector('.dne-ct') || el
  const r = sel.getRangeAt(0)
  const probe = r.cloneRange()
  probe.selectNodeContents(ct)
  probe.setStart(r.endContainer, r.endOffset)
  return probe.toString().length === 0
}
function currentBlockEl(container) {
  const sel=window.getSelection(); if(!sel) return null
  let n=sel.anchorNode
  while(n&&n!==container){if(n.parentElement===container)return n;n=n.parentElement}
  return null
}
function updateMarkers(container) {
  const blocks=addCounters(parseDom(container))
  blocks.forEach(b=>{
    const el=container.querySelector(`[data-id="${b.id}"]`)
    const mk=el?.querySelector('.dne-mk'); if(mk) mk.textContent=markerStr(b.type,b.level,b.counter||1)
  })
}

// ── Preview ───────────────────────────────────────────────────────────────────
function Preview({ text }) {
  if(!text?.trim()) return <p className="p-4 text-sm text-gray-300 italic">작성한 내용이 없습니다...</p>
  const blocks=addCounters(deserialize(text))
  return (
    <div className="p-4 space-y-0.5">
      {blocks.map(b=>{
        const pl={paddingLeft:`${b.level*18}px`}
        if(b.type==='divider') return <hr key={b.id} className="border-gray-200 my-2"/>
        if(b.type==='h1') return <p key={b.id} className="text-xl font-bold text-zinc-900 my-1" style={pl}>{b.content}</p>
        if(b.type==='h2') return <p key={b.id} className="text-lg font-semibold text-zinc-900" style={pl}>{b.content}</p>
        if(b.type==='h3') return <p key={b.id} className="text-base font-semibold text-zinc-800" style={pl}>{b.content}</p>
        if(b.type==='bullet'||b.type==='numbered') return(
          <div key={b.id} className="flex gap-1.5 text-sm text-zinc-800" style={pl}>
            <span className="shrink-0 text-gray-400 tabular-nums select-none">{markerStr(b.type,b.level,b.counter||1)}</span>
            <span>{b.content}</span>
          </div>)
        return b.content?<p key={b.id} className="text-sm text-zinc-800 leading-relaxed">{b.content}</p>:<div key={b.id} className="h-1.5"/>
      })}
    </div>
  )
}

// ── Main Editor ───────────────────────────────────────────────────────────────
function Editor({ dow }) {
  const notes=useDayNoteStore(s=>s.notes); const upsert=useDayNoteStore(s=>s.upsertNote)
  const editorRef=useRef(null); const saveTimer=useRef(null); const blocksRef=useRef([])
  const [preview,setPreview]=useState(false); const [savedText,setSavedText]=useState(notes[dow]||'')
  const isMobile=()=>window.innerWidth<640

  const save=(bks)=>{clearTimeout(saveTimer.current);const txt=serialize(bks);setSavedText(txt);saveTimer.current=setTimeout(()=>upsert(dow,txt),600)}

  function syncDom(blocks) {
    const el=editorRef.current; if(!el) return
    el.innerHTML=''
    addCounters(blocks).forEach(b=>el.appendChild(buildEl(b)))
    blocksRef.current=blocks
  }

  useEffect(()=>{
    const bks=deserialize(notes[dow]||''); setSavedText(notes[dow]||''); syncDom(bks)
  },[dow])

  const handleInput=useCallback(()=>{
    const el=editorRef.current; if(!el) return
    const bks=parseDom(el); blocksRef.current=bks; updateMarkers(el); save(bks)
  },[dow,upsert])

  const handleKeyDown=useCallback((e)=>{
    const container=editorRef.current; if(!container) return
    const blockEl=currentBlockEl(container); if(!blockEl) return
    const type=blockEl.dataset.bt||'text'; const level=parseInt(blockEl.dataset.lv||'0')
    const content=getContent(blockEl); const N=isMobile()?2:4

    // Space → type conversion (cursor at end, in text block)
    if(e.key===' '&&type==='text'&&isAtEnd(blockEl)){
      let nt=null
      if(content==='-'||content==='*')nt='bullet'
      else if(/^\d+\.$/.test(content))nt='numbered'
      else if(content==='#')nt='h1'
      else if(content==='##')nt='h2'
      else if(content==='###')nt='h3'
      if(nt){
        e.preventDefault()
        const nb=newBlock(nt,'',level)
        const fresh=buildEl({...nb,counter:1})
        container.replaceChild(fresh,blockEl)
        updateMarkers(container); save(parseDom(container))
        container.focus(); cursorToStart(fresh)
        return
      }
    }

    // Enter
    if(e.key==='Enter'){
      e.preventDefault()
      // '---' → divider
      if(type==='text'&&content==='---'){
        const fresh=buildEl(newBlock('divider'))
        const textB=buildEl(newBlock()); container.replaceChild(fresh,blockEl)
        fresh.after(textB); updateMarkers(container); save(parseDom(container))
        cursorToStart(textB); return
      }
      // Empty list → exit or decrease level
      if((type==='bullet'||type==='numbered')&&!content.trim()){
        if(level>0){
          blockEl.dataset.lv=String(level-1); blockEl.style.paddingLeft=`${(level-1)*18}px`
          updateMarkers(container); save(parseDom(container))
        } else {
          const fresh=buildEl(newBlock()); container.replaceChild(fresh,blockEl)
          updateMarkers(container); save(parseDom(container)); container.focus(); cursorToStart(fresh)
        }
        return
      }
      // New block
      const isList=type==='bullet'||type==='numbered'
      const fresh=buildEl(newBlock(isList?type:'text','',isList?level:0))
      blockEl.after(fresh); updateMarkers(container); save(parseDom(container)); container.focus(); cursorToStart(fresh)
      return

    }

    // Tab
    if(e.key==='Tab'){
      e.preventDefault()
      if(type==='bullet'||type==='numbered'){
        const nl=e.shiftKey?Math.max(0,level-1):level+1
        blockEl.dataset.lv=String(nl); blockEl.style.paddingLeft=`${nl*18}px`
        updateMarkers(container); save(parseDom(container))
      } else {
        const ct=blockEl.querySelector('.dne-ct')||blockEl; const sel=window.getSelection()
        const r=sel.getRangeAt(0); const sp=' '.repeat(N); const tn=document.createTextNode(sp)
        r.deleteContents(); r.insertNode(tn); r.setStartAfter(tn); r.collapse(true)
        sel.removeAllRanges(); sel.addRange(r)
        save(parseDom(container))
      }
      return
    }

    // Backspace at block start
    if(e.key==='Backspace'&&isAtStart(blockEl)){
      if(type!=='text'){e.preventDefault();const fresh=buildEl(newBlock('text',content,0));container.replaceChild(fresh,blockEl);updateMarkers(container);save(parseDom(container));container.focus();cursorToEnd(fresh);return}
      const prev=blockEl.previousElementSibling; if(!prev) return
      if(prev.dataset.bt==='divider'){e.preventDefault();prev.remove();updateMarkers(container);save(parseDom(container));return}
      e.preventDefault()
      const prevCt=prev.querySelector('.dne-ct')||prev; const prevLen=prevCt.innerText.length
      prevCt.textContent=prevCt.innerText+content; blockEl.remove()
      updateMarkers(container); save(parseDom(container))
      // Restore cursor
      const sel=window.getSelection(); const r=document.createRange()
      const tn=Array.from(prevCt.childNodes).find(n=>n.nodeType===3)
      if(tn){r.setStart(tn,prevLen);r.collapse(true);sel.removeAllRanges();sel.addRange(r)}
      return
    }

    // Arrow nav (block-to-block)
    if(e.key==='ArrowUp'&&isAtStart(blockEl)){
      const prev=blockEl.previousElementSibling; if(prev){e.preventDefault();cursorToEnd(prev)}
    }
    if(e.key==='ArrowDown'&&isAtEnd(blockEl)){
      const next=blockEl.nextElementSibling; if(next){e.preventDefault();cursorToStart(next)}
    }
  },[])

  // Mobile indent for focused block
  const applyIndent=(shift)=>{
    const container=editorRef.current; if(!container) return
    const blockEl=currentBlockEl(container); if(!blockEl) return
    const t=blockEl.dataset.bt; const l=parseInt(blockEl.dataset.lv||'0')
    if(t==='bullet'||t==='numbered'){
      const nl=shift?Math.max(0,l-1):l+1; blockEl.dataset.lv=String(nl); blockEl.style.paddingLeft=`${nl*18}px`
      updateMarkers(container); save(parseDom(container))
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end gap-1 px-3 py-1.5 border-b border-white/30 flex-shrink-0">
        <button onClick={()=>setPreview(false)} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${!preview?'bg-white/80 text-zinc-900 shadow-sm':'text-zinc-500 hover:text-zinc-700'}`}>
          <Edit3 size={12} className="inline mr-1"/>편집
        </button>
        <button onClick={()=>{clearTimeout(saveTimer.current);upsert(dow,serialize(parseDom(editorRef.current)));setSavedText(serialize(parseDom(editorRef.current)));setPreview(true)}} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${preview?'bg-white/80 text-zinc-900 shadow-sm':'text-zinc-500 hover:text-zinc-700'}`}>
          <Eye size={12} className="inline mr-1"/>미리보기
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {preview
          ? <Preview text={savedText}/>
          : <div ref={editorRef} contentEditable suppressContentEditableWarning
              onInput={handleInput} onKeyDown={handleKeyDown}
              className="p-4 outline-none min-h-full"
              style={{caretColor:'#111827'}}
            />
        }
      </div>

      {!preview&&(
        <div className="sm:hidden flex gap-2 px-3 py-2 border-t border-white/30 flex-shrink-0">
          <button onPointerDown={e=>{e.preventDefault();applyIndent(true)}} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 rounded-lg text-xs font-medium text-zinc-700 select-none"><Outdent size={14}/>내어쓰기</button>
          <button onPointerDown={e=>{e.preventDefault();applyIndent(false)}} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 rounded-lg text-xs font-medium text-zinc-700 select-none"><Indent size={14}/>들여쓰기</button>
        </div>
      )}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export default function DayNotePanel({ dow, onClose }) {
  const [visible,setVisible]=useState(false)
  const fetchNotes=useDayNoteStore(s=>s.fetchNotes)
  useEffect(()=>{fetchNotes();requestAnimationFrame(()=>setVisible(true));},[])
  const close=()=>{setVisible(false);setTimeout(onClose,250)}

  return (
    <>
      <div className="fixed inset-0 z-40" style={{background:'rgba(0,0,0,0.08)',opacity:visible?1:0,transition:'opacity 250ms'}} onClick={close}/>
      <div style={{position:'fixed',top:0,right:0,bottom:0,width:'min(100vw, 400px)',zIndex:50,background:'rgba(255,255,255,0.88)',backdropFilter:'blur(20px) saturate(1.6)',WebkitBackdropFilter:'blur(20px) saturate(1.6)',borderLeft:'1px solid rgba(255,255,255,0.5)',boxShadow:'-8px 0 32px rgba(0,0,0,0.08)',transform:visible?'translateX(0)':'translateX(100%)',transition:'transform 250ms cubic-bezier(0.4,0,0.2,1)',display:'flex',flexDirection:'column',paddingTop:'env(safe-area-inset-top)',paddingBottom:'env(safe-area-inset-bottom)'}}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/40 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white bg-zinc-900 rounded-full px-2.5 py-0.5 select-none">{DAYS_FULL[dow]}</span>
            <span className="text-sm font-semibold text-zinc-700">노트</span>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-zinc-100/70 transition-colors text-zinc-500"><X size={15}/></button>
        </div>
        <div className="flex-1 overflow-hidden"><Editor dow={dow}/></div>
      </div>
    </>
  )
}
