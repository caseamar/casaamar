
const h=document.getElementById('header'),m=document.querySelector('.menu'),n=document.getElementById('nav');addEventListener('scroll',()=>h.classList.toggle('scrolled',scrollY>25));m.onclick=()=>n.classList.toggle('open');
const s=[...document.querySelectorAll('.slide')],d=[...document.querySelectorAll('.dots button')];let i=0;function go(x){i=x;s.forEach((e,j)=>e.classList.toggle('active',j===x));d.forEach((e,j)=>e.classList.toggle('active',j===x))}d.forEach((e,j)=>e.onclick=()=>go(j));setInterval(()=>go((i+1)%s.length),3200);
document.querySelectorAll('.story-card').forEach((c,k)=>{
  const a=[...c.querySelectorAll('.story-slide')];
  if(a.length<2)return;
  let x=0, timer;
  const schedule=()=>{
    clearTimeout(timer);
    const duration=Number(a[x].dataset.duration||4000);
    timer=setTimeout(()=>{
      a[x].classList.remove('active');
      x=(x+1)%a.length;
      a[x].classList.add('active');
      schedule();
    },duration);
  };
  setTimeout(schedule,k*700);
});

const locationImages=[...document.querySelectorAll('.location-visual img')];
const locationTitles=[
  ['Stranden på få minutter','Kysten, promenaden og restauranterne i Fuengirola ligger tæt nok på til både korte ture og hele stranddage.'],
  ['Park og grønne omgivelser','Mijas-parken giver plads til en gåtur, leg og ro med bjergene i baggrunden.'],
  ['Golf og aktive dage','Flere golfbaner og gode muligheder for cykling og ture i baglandet ligger inden for rækkevidde.'],
  ['Pool tæt på huset','Urbanisationens pool og fællesarealer gør det nemt at vælge en rolig dag hjemme.']
];
let locationIndex=0;
if(locationImages.length){
  setInterval(()=>{
    locationImages[locationIndex].classList.remove('active');
    locationIndex=(locationIndex+1)%locationImages.length;
    locationImages[locationIndex].classList.add('active');
    const title=document.getElementById('locationTitle');
    const text=document.getElementById('locationText');
    if(title&&text){title.textContent=locationTitles[locationIndex][0];text.textContent=locationTitles[locationIndex][1];}
  },4500);
}

