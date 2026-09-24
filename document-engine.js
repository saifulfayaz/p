/* PDF Studio document geometry and image processing. All coordinates are image pixels. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function area(p){return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y},0)/2)}
function order(p){const c={x:p.reduce((s,v)=>s+v.x,0)/4,y:p.reduce((s,v)=>s+v.y,0)/4};p=p.slice().sort((a,b)=>Math.atan2(a.y-c.y,a.x-c.x)-Math.atan2(b.y-c.y,b.x-c.x));let first=0;for(let i=1;i<4;i++)if(p[i].x+p[i].y<p[first].x+p[first].y)first=i;return [...p.slice(first),...p.slice(0,first)]}
function valid(p,w,h){if(!p||p.length!==4||p.some(q=>!Number.isFinite(q.x+q.y)||q.x<0||q.y<0||q.x>w||q.y>h))return false;let sign=0;for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4],c=p[(i+2)%4];const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);if(Math.abs(cross)<2)return false;if(sign&&Math.sign(cross)!==sign)return false;sign=Math.sign(cross);if(distance(a,b)<Math.min(w,h)*.025)return false;}return area(p)>w*h*.012}
function pixel(data,w,h,x,y,c){return data[(clamp(Math.round(y),0,h-1)*w+clamp(Math.round(x),0,w-1))*4+c]}
function contrast(data,w,h,x,y,nx,ny,offset){let s=0;for(let c=0;c<3;c++){const d=pixel(data,w,h,x+nx*offset,y+ny*offset,c)-pixel(data,w,h,x-nx*offset,y-ny*offset,c);s+=d*d;}return Math.sqrt(s/3)}
function scoreQuad(p,data,w,h){
 const ar=area(p)/(w*h);if(ar<.02||ar>.994)return null;
 let borderEdges=0,minAngle=1,edgeScores=[],strengths=[];
 for(let i=0;i<4;i++){
  const a=p[i],b=p[(i+1)%4],prev=p[(i+3)%4],len=distance(a,b),nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len;
  const cosine=Math.abs(((b.x-a.x)*(prev.x-a.x)+(b.y-a.y)*(prev.y-a.y))/(len*distance(a,prev)));
  minAngle=Math.min(minAngle,1-cosine);if(cosine>.975)return null;
  if((a.x<4&&b.x<4)||(a.y<4&&b.y<4)||(a.x>w-5&&b.x>w-5)||(a.y>h-5&&b.y>h-5))borderEdges++;
  let support=0,strength=0;const count=48;
  for(let k=0;k<count;k++){const t=.05+.9*k/(count-1),x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;let best=0;for(let o=-2;o<=2;o+=2)best=Math.max(best,contrast(data,w,h,x+nx*o,y+ny*o,nx,ny,3));support+=Math.min(1,best/18);strength+=Math.min(1,best/65);}
  edgeScores.push(support/count);strengths.push(strength/count);
 }
 if(borderEdges>=3)return null;
 const edge=edgeScores.reduce((a,b)=>a+b)/4,weakest=Math.min(...edgeScores),strength=strengths.reduce((a,b)=>a+b)/4;
 const size=Math.min(1,Math.sqrt(ar/.65));
 return {score:.38*edge+.17*weakest+.14*strength+.20*size+.11*Math.sqrt(minAngle)-borderEdges*.11,edge,weakest,area:ar};
}
function lineFit(points){if(points.length<8)return null;let x=0,y=0;for(const p of points){x+=p.x;y+=p.y}x/=points.length;y/=points.length;let xx=0,yy=0,xy=0;for(const p of points){xx+=(p.x-x)**2;yy+=(p.y-y)**2;xy+=(p.x-x)*(p.y-y)}const angle=.5*Math.atan2(2*xy,xx-yy);return {x,y,dx:Math.cos(angle),dy:Math.sin(angle)}}
function intersect(a,b){const den=a.dx*b.dy-a.dy*b.dx;if(Math.abs(den)<.07)return null;const t=((b.x-a.x)*b.dy-(b.y-a.y)*b.dx)/den;return{x:a.x+t*a.dx,y:a.y+t*a.dy}}
function refine(p,data,w,h){
 const lines=[];const radius=clamp(Math.round(Math.max(w,h)*.005),3,10);
 for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4],len=distance(a,b),nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len;const samples=[];
  for(let k=0;k<75;k++){const t=.06+.88*k/74,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;let best=5,bestO=0;
   for(let o=-radius;o<=radius;o++){const v=contrast(data,w,h,x+nx*o,y+ny*o,nx,ny,1.5)*Math.exp(-Math.abs(o)/(radius*2));if(v>best){best=v;bestO=o}}
   if(best>5)samples.push({x:x+nx*bestO,y:y+ny*bestO});
  }
  let fit=lineFit(samples);if(!fit)return p;
  for(let j=0;j<2;j++){const residual=samples.map(s=>Math.abs((s.x-fit.x)*fit.dy-(s.y-fit.y)*fit.dx));const sorted=residual.slice().sort((a,b)=>a-b),limit=Math.max(1.4,sorted[Math.floor(sorted.length*.5)]*2.6);const next=lineFit(samples.filter((_,i)=>residual[i]<limit));if(next)fit=next;}
  lines.push(fit);
 }
 const refined=p.map((_,i)=>intersect(lines[(i+3)%4],lines[i]));
 if(refined.some((q,i)=>!q||distance(q,p[i])>radius*3)||!valid(refined,w,h))return p;
 return refined;
}
function detect(cv,image,region){
 const owned=[];const M=(...args)=>{const m=new cv.Mat(...args);owned.push(m);return m};const keep=m=>(owned.push(m),m);
 try{
  const input=keep(cv.matFromImageData(image));let source=input;let ox=0,oy=0,rw=image.width,rh=image.height;
  if(region){ox=clamp(Math.floor(region.x),0,rw-2);oy=clamp(Math.floor(region.y),0,rh-2);rw=clamp(Math.ceil(region.width),2,rw-ox);rh=clamp(Math.ceil(region.height),2,rh-oy);source=keep(input.roi(new cv.Rect(ox,oy,rw,rh)));}
  const scale=Math.min(1,1100/Math.max(rw,rh)),w=Math.round(rw*scale),h=Math.round(rh*scale),src=M();cv.resize(source,src,new cv.Size(w,h),0,0,cv.INTER_AREA);
  const gray=M(),smooth=M(),balanced=M(),mask=M(),closed=M(),channels=keep(new cv.MatVector()),kernel=keep(cv.getStructuringElement(cv.MORPH_RECT,new cv.Size(5,5)));
  cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);cv.GaussianBlur(gray,smooth,new cv.Size(5,5),0);cv.equalizeHist(smooth,balanced);cv.split(src,channels);
  const candidates=[];let pass=0;
  function collect(binary,label){
   const contours=new cv.MatVector(),hierarchy=new cv.Mat();
   try{cv.findContours(binary,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);const ranked=[];for(let i=0;i<contours.size();i++){const contour=contours.get(i);const a=Math.abs(cv.contourArea(contour));contour.delete();if(a>w*h*.018&&a<w*h*.998)ranked.push([i,a]);}ranked.sort((a,b)=>b[1]-a[1]);
    for(const [idx,a] of ranked.slice(0,28)){const contour=contours.get(idx),hull=new cv.Mat(),approx=new cv.Mat();try{cv.convexHull(contour,hull);for(const shape of [contour,hull]){const peri=cv.arcLength(shape,true);for(const epsilon of [.012,.02,.032,.045]){cv.approxPolyDP(shape,approx,peri*epsilon,true);if(approx.rows!==4||!cv.isContourConvex(approx))continue;const p=order(Array.from({length:4},(_,i)=>({x:approx.data32S[i*2],y:approx.data32S[i*2+1]})));if(!valid(p,w,h)||a/area(p)<.64)continue;const score=scoreQuad(p,src.data,w,h);if(!score||score.score<.32)continue;const match=candidates.find(c=>c.points.reduce((sum,q,i)=>sum+distance(q,p[i]),0)/4<Math.max(w,h)*.018);if(match){match.passes.add(pass);if(score.score>match.score){Object.assign(match,score);match.points=p;}}else candidates.push({points:p,...score,passes:new Set([pass]),source:label});}}}finally{contour.delete();hull.delete();approx.delete();}}
   }finally{contours.delete();hierarchy.delete();}pass++;
  }
  // Edges in luminance and colour work with light, dark, or coloured documents.
  for(const [lo,hi] of [[18,55],[45,120],[85,200]]){cv.Canny(smooth,mask,lo,hi);cv.morphologyEx(mask,closed,cv.MORPH_CLOSE,kernel);collect(closed,'outline');}
  cv.Canny(balanced,mask,45,140);cv.morphologyEx(mask,closed,cv.MORPH_CLOSE,kernel);collect(closed,'contrast outline');
  for(let c=0;c<3;c++){const ch=channels.get(c);try{cv.GaussianBlur(ch,mask,new cv.Size(5,5),0);cv.Canny(mask,closed,30,90);cv.morphologyEx(closed,mask,cv.MORPH_CLOSE,kernel);collect(mask,'colour outline');}finally{ch.delete();}}
  // Independent bright and dark silhouettes; no forced axis-aligned fallback.
  for(const type of [cv.THRESH_BINARY,cv.THRESH_BINARY_INV]){cv.threshold(smooth,mask,0,255,type|cv.THRESH_OTSU);cv.morphologyEx(mask,closed,cv.MORPH_CLOSE,kernel);collect(closed,'silhouette');}
  for(const threshold of [100,155,200]){cv.threshold(smooth,mask,threshold,255,cv.THRESH_BINARY);cv.morphologyEx(mask,closed,cv.MORPH_CLOSE,kernel);collect(closed,'paper boundary');}
  cv.adaptiveThreshold(smooth,mask,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY,51,7);cv.morphologyEx(mask,closed,cv.MORPH_CLOSE,kernel);collect(closed,'local contrast');
  candidates.forEach(c=>c.rank=c.score+Math.min(.06,c.passes.size*.012));candidates.sort((a,b)=>b.rank-a.rank);
  const result=[];
  for(const c of candidates.slice(0,12)){
   let points=c.points.map(p=>({x:p.x/scale+ox,y:p.y/scale+oy}));points=refine(points,image.data,image.width,image.height);
   if(result.some(r=>r.points.reduce((s,q,i)=>s+distance(q,points[i]),0)/4<Math.max(image.width,image.height)*.025))continue;
   const confidence=c.edge>.8&&c.weakest>.55&&c.score>.65&&c.passes.size>=2?'strong':c.edge>.55&&c.score>.49?'possible':'review';
   result.push({points,confidence,score:c.score,source:c.source});if(result.length>=4)break;
  }
  return {candidates:result};
 }finally{for(let i=owned.length-1;i>=0;i--)owned[i].delete();}
}
function warp(cv,image,points,aspect){
 if(!valid(points,image.width,image.height))throw new Error('Keep all four corners in order around the document.');
 const owned=[];const keep=m=>(owned.push(m),m);
 try{const p=points;let w=Math.round(Math.max(distance(p[0],p[1]),distance(p[3],p[2]))),h=Math.round(Math.max(distance(p[0],p[3]),distance(p[1],p[2])));
  if(aspect>0){const pixels=w*h;w=Math.round(Math.sqrt(pixels*aspect));h=Math.round(w/aspect);}const scale=Math.min(1,5000/Math.max(w,h),Math.sqrt(14000000/(w*h)));w=Math.max(2,Math.round(w*scale));h=Math.max(2,Math.round(h*scale));
  const src=keep(cv.matFromImageData(image)),dst=keep(new cv.Mat()),s=keep(cv.matFromArray(4,1,cv.CV_32FC2,p.flatMap(q=>[q.x,q.y]))),d=keep(cv.matFromArray(4,1,cv.CV_32FC2,[0,0,w-1,0,w-1,h-1,0,h-1])),matrix=keep(cv.getPerspectiveTransform(s,d));
  cv.warpPerspective(src,dst,matrix,new cv.Size(w,h),cv.INTER_CUBIC,cv.BORDER_REPLICATE);
  return {data:new Uint8ClampedArray(dst.data),width:w,height:h};
 }finally{owned.reverse().forEach(m=>m.delete());}
}
function enhance(cv,image,settings){
 const owned=[];const keep=m=>(owned.push(m),m);
 try{
  const src=keep(cv.matFromImageData(image));let dst=src;
  if(settings.clean){const small=keep(new cv.Mat()),gray=keep(new cv.Mat()),background=keep(new cv.Mat()),large=keep(new cv.Mat()),kernel=keep(cv.getStructuringElement(cv.MORPH_ELLIPSE,new cv.Size(17,17)));const f=Math.min(1,650/Math.max(src.cols,src.rows));cv.resize(src,small,new cv.Size(Math.max(2,Math.round(src.cols*f)),Math.max(2,Math.round(src.rows*f))),0,0,cv.INTER_AREA);cv.cvtColor(small,gray,cv.COLOR_RGBA2GRAY);cv.morphologyEx(gray,background,cv.MORPH_CLOSE,kernel);cv.GaussianBlur(background,background,new cv.Size(25,25),0);cv.resize(background,large,new cv.Size(src.cols,src.rows),0,0,cv.INTER_LINEAR);dst=keep(src.clone());for(let i=0;i<src.rows*src.cols;i++){const gain=clamp(245/Math.max(55,large.data[i]),1,2.9);for(let c=0;c<3;c++)dst.data[i*4+c]=clamp(src.data[i*4+c]*gain,0,255);}}
  if(settings.tone==='gray'||settings.tone==='bw'){const gray=keep(new cv.Mat()),out=keep(new cv.Mat());cv.cvtColor(dst,gray,cv.COLOR_RGBA2GRAY);if(settings.tone==='bw')cv.adaptiveThreshold(gray,gray,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY,Math.max(3,Math.min(51,(Math.floor(Math.min(gray.cols,gray.rows)/2)*2-1))),12);cv.cvtColor(gray,out,cv.COLOR_GRAY2RGBA);dst=out;}
  if(settings.sharpness>0){const blur=keep(new cv.Mat()),out=keep(new cv.Mat());cv.GaussianBlur(dst,blur,new cv.Size(0,0),1.1);const amount=settings.sharpness/100*1.4;cv.addWeighted(dst,1+amount,blur,-amount,0,out);dst=out;}
  return {data:new Uint8ClampedArray(dst.data),width:dst.cols,height:dst.rows};
 }finally{owned.reverse().forEach(m=>m.delete());}
}
root.PDFEngine={detect,warp,enhance,order,valid,area};
})(typeof self!=='undefined'?self:globalThis);
