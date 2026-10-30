const polar=(n,r,angle=-Math.PI/2)=>Array.from({length:n},(_,i)=>[100+r*Math.cos(angle+2*Math.PI*i/n),100+r*Math.sin(angle+2*Math.PI*i/n)]);
const ring=p=>p.map((a,i)=>[a,p[(i+1)%p.length]]);
const join=(p,step)=>p.map((a,i)=>[a,p[(i+step)%p.length]]);
const designs=[];
let p=polar(10,82).map((a,i)=>i%2?[100+(a[0]-100)*.46,100+(a[1]-100)*.46]:a);designs.push(['五芒星切面',[...ring(p),...ring(p.filter((_,i)=>i%2))]]);
p=polar(6,82);designs.push(['六芒結晶',[...ring(p.filter((_,i)=>i%2===0)),...ring(p.filter((_,i)=>i%2===1)),...ring(polar(6,47,-Math.PI/3))]]);
p=polar(8,80,Math.PI/8);designs.push(['八角花窗',[...ring(p),...join(p,3)]]);
p=polar(12,82);let roseInner=polar(12,46,-Math.PI/2-Math.PI/12);designs.push(['十二瓣玫瑰窗',[...ring(roseInner),...p.flatMap((v,i)=>[[v,roseInner[i]],[v,roseInner[(i+1)%12]]])]]);
let es=[];const hexCenters=[[100,100],...polar(6,43,-Math.PI/2)];for(const c of hexCenters)es.push(...ring(polar(6,25,0).map(a=>[a[0]-100+c[0],a[1]-100+c[1]])));designs.push(['七格蜂巢',es]);
p=polar(6,82,-Math.PI/2);designs.push(['等角立方體',[...ring(p),...p.filter((_,i)=>i%2===1).map(a=>[[100,100],a])]]);
p=polar(6,80);es=[...ring(p),...ring(polar(6,45))];for(let i=0;i<6;i++){es.push([p[i],polar(6,45)[i]],[p[i],polar(6,45)[(i+1)%6]])}designs.push(['六角鑽石',es]);
es=[...ring(polar(4,82)),...ring(polar(4,82/Math.sqrt(2),-Math.PI/4)),...ring(polar(4,41))];designs.push(['三重方結',es]);
p=polar(3,82);es=[...ring(p),...ring(p.map((v,i)=>[(v[0]+p[(i+1)%3][0])/2,(v[1]+p[(i+1)%3][1])/2]))];designs.push(['交織三角',es]);
es=[];for(let k=0;k<6;k++){const a=k*Math.PI/3;const centre=[100+40*Math.cos(a),100+40*Math.sin(a)];const petal=[[100,100],[100+72*Math.cos(a-.3),100+72*Math.sin(a-.3)],[100+84*Math.cos(a),100+84*Math.sin(a)],[100+72*Math.cos(a+.3),100+72*Math.sin(a+.3)]];es.push(...ring(petal));}designs.push(['六葉風花',es]);
p=polar(5,80);es=[...ring(p),...join(p,2)];designs.push(['星環五邊形',es]);
es=[...ring([[100,22],[178,83],[148,166],[52,166],[22,83]]),...ring([[100,62],[145,97],[127,145],[73,145],[55,97]])];const outer=[[100,22],[178,83],[148,166],[52,166],[22,83]],inner=[[100,62],[145,97],[127,145],[73,145],[55,97]];for(let i=0;i<5;i++)es.push([outer[i],inner[i]],[outer[i],inner[(i+1)%5]]);designs.push(['寶石冠冕',es]);
function intersection([a,b],[c,d]){const x=b[0]-a[0],y=b[1]-a[1],u=d[0]-c[0],v=d[1]-c[1],det=x*v-y*u;if(Math.abs(det)<1e-6)return null;const t=((c[0]-a[0])*v-(c[1]-a[1])*u)/det,s=((c[0]-a[0])*y-(c[1]-a[1])*x)/det;return t>=0&&t<=1&&s>=0&&s<=1?[a[0]+t*x,a[1]+t*y]:null;}

module.exports={designs,intersection};
