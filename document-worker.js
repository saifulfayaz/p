let runtime;
const ready=new Promise((resolve,reject)=>{
 try{
  importScripts('vendor/opencv.js','document-engine.js');
  if(self.cv.Mat){runtime=self.cv;resolve();}
  else if(typeof self.cv.then==='function')self.cv.then(mod=>{runtime=mod;resolve();});
  else self.cv.onRuntimeInitialized=()=>{runtime=self.cv;resolve();};
 }catch(e){reject(e);}
});
self.onmessage=async({data:message})=>{
 const {id,action,image,points,aspect,settings,region}=message;
 try{await ready;let result;
  if(action==='detect')result=self.PDFEngine.detect(runtime,image,region);
  else if(action==='warp')result=self.PDFEngine.warp(runtime,image,points,aspect);
  else if(action==='enhance')result=self.PDFEngine.enhance(runtime,image,settings);
  else throw new Error('Unknown image operation.');
  if(result.data)self.postMessage({id,result},[result.data.buffer]);else self.postMessage({id,result});
 }catch(e){self.postMessage({id,error:typeof e==='number'?'The image could not be processed. Try a smaller image.':e?.message||'Image processing failed.'});}
};
