async function decodePhoto(file){
  if(typeof globalThis.createImageBitmap==='function'){
    try{const bitmap=await globalThis.createImageBitmap(file);return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()};}catch{}
  }
  const url=URL.createObjectURL(file);
  try{
    const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Não foi possível abrir esta foto. Tente a câmera ou uma imagem JPG, PNG ou WebP.'));img.src=url;});
    return {source:image,width:image.naturalWidth||image.width,height:image.naturalHeight||image.height,close:()=>URL.revokeObjectURL(url)};
  }catch(error){URL.revokeObjectURL(url);throw error;}
}
export async function preparePhotoImage(file){
  if(!file||file.size===0||file.size>20*1024*1024)throw new Error('Escolha uma imagem de até 20 MB.');
  const image=await decodePhoto(file);
  try{
    if(!image.width||!image.height)throw new Error('Não foi possível ler as dimensões desta foto.');
    const scale=Math.min(1,1280/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Seu navegador não conseguiu preparar a foto. Tente novamente.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image.source,0,0,canvas.width,canvas.height);
    const output=canvas.toDataURL('image/jpeg',.84);if(!output.startsWith('data:image/jpeg;base64,'))throw new Error('Não foi possível converter esta foto. Escolha uma imagem JPG.');
    return output.split(',')[1];
  }finally{image.close();}
}
