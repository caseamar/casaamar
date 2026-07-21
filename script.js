const header=document.querySelector('[data-header]');
const menuButton=document.querySelector('[data-menu-button]');
const menu=document.querySelector('[data-menu]');
const updateHeader=()=>header?.classList.toggle('scrolled',window.scrollY>40);
updateHeader();window.addEventListener('scroll',updateHeader,{passive:true});

menuButton?.addEventListener('click',()=>{const open=menu.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));});
menu?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{menu.classList.remove('open');menuButton?.setAttribute('aria-expanded','false');}));

const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

document.querySelectorAll('[data-slider]').forEach(slider=>{
  const slides=[...slider.querySelectorAll(':scope > article')];
  const dotsHost=slider.querySelector('[data-dots]');
  if(slides.length<2)return;
  let current=0;
  const dots=slides.map((_,i)=>{
    const b=document.createElement('button');
    b.type='button';
    b.setAttribute('aria-label',`Vis billede ${i+1}`);
    b.addEventListener('click',()=>show(i,true));
    dotsHost?.appendChild(b);
    return b;
  });
  function show(i,manual=false){
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current=(i+slides.length)%slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
    if(manual)restart();
  }
  dots[0]?.classList.add('active');
  const interval=Number(slider.dataset.interval||7000);
  let timer=setInterval(()=>show(current+1),interval);
  function restart(){clearInterval(timer);timer=setInterval(()=>show(current+1),interval);}
  slider.addEventListener('mouseenter',()=>clearInterval(timer));
  slider.addEventListener('mouseleave',restart);
});

const lightbox=document.querySelector('[data-lightbox]');
const lightboxImg=lightbox?.querySelector('img');
document.querySelectorAll('[data-gallery] button').forEach(button=>{
  button.addEventListener('click',()=>{
    const img=button.querySelector('img');
    lightboxImg.src=img.src;
    lightboxImg.alt=img.alt;
    lightbox.hidden=false;
  });
});
lightbox?.querySelector('.lightbox-close')?.addEventListener('click',()=>lightbox.hidden=true);
lightbox?.addEventListener('click',e=>{if(e.target===lightbox)lightbox.hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&lightbox&&!lightbox.hidden)lightbox.hidden=true;});
